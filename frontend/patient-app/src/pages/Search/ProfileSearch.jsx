import { useEffect, useMemo, useRef, useState } from "react";
import client from "../../api/client";

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

function fmtMoney(n) {
  return Number(n || 0).toLocaleString("vi-VN") + " đ";
}
function fmtDate(d) {
  if (!isIsoDate(d)) return "--/--/----";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}
function cls(...a) {
  return a.filter(Boolean).join(" ");
}

export default function ResultsPage() {
  // === lấy thông tin BN để gửi lên idBenhNhan (bắt buộc cho patientSelfOrStaff) ===
  const patient = useMemo(() => {
    try {
      const raw =
        sessionStorage.getItem("PATIENT_INFO") ||
        localStorage.getItem("PATIENT_INFO");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const idBenhNhan = patient?.idBenhNhan;

  // bộ lọc
  const [date, setDate] = useState(""); // để trống = tất cả ngày
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  // dữ liệu
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // các lịch hẹn + payment
  const [error, setError] = useState("");

  // quản lý poll đơn theo idDonHang
  const pollTimers = useRef({}); // { orderId: intervalId }
  const loadAbort = useRef(null);

  useEffect(() => {
    load();
    return () => {
      // dọn poll + huỷ request đang chạy
      Object.values(pollTimers.current).forEach(clearInterval);
      pollTimers.current = {};
      if (loadAbort.current) {
        loadAbort.current.abort();
        loadAbort.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, unpaidOnly, idBenhNhan]);

  async function load() {
    if (!idBenhNhan) {
      setError("Thiếu thông tin bệnh nhân (idBenhNhan). Vui lòng đăng nhập lại.");
      setItems([]);
      setLoading(false);
      return;
    }
    // huỷ request cũ nếu có
    if (loadAbort.current) loadAbort.current.abort();
    loadAbort.current = new AbortController();

    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      q.set("idBenhNhan", String(idBenhNhan)); // <<< BẮT BUỘC
      if (isIsoDate(date)) q.set("date", date);
      if (unpaidOnly) q.set("unpaidOnly", "true");

      const { data } = await client.get(
        `/appointments/my-with-payments?${q.toString()}`,
        { signal: loadAbort.current.signal }
      );
      setItems(data?.items || []);
    } catch (e) {
      if (e.name === "CanceledError" || e.name === "AbortError") return;
      setItems([]);
      setError(
        e?.response?.data?.message || e?.message || "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }

  // tạo/tái sử dụng đơn & bắt đầu poll
  async function createOrShowPayment(appt) {
    try {
      // BE sẽ tạo đơn mới hoặc trả lại đơn PENDING hiện có
      const { data } = await client.post("/payments", {
        idLichHen: appt.idLichHen,
      });

      // chèn/ghi đè payment vào item tương ứng
      setItems((prev) =>
        prev.map((it) =>
          it.idLichHen === appt.idLichHen
            ? {
                ...it,
                payment: {
                  id: data.id,
                  status: data.status,
                  amount: data.amount,
                  qrUrl: data.qrUrl,
                  referenceCode:
                    data.referenceCode || it.payment?.referenceCode || "",
                  createdAt: data.createdAt || null,
                },
              }
            : it
        )
      );

      // poll đến khi PAID
      startPollingOrder(appt.idLichHen, data.id);
    } catch (e) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          "Không thể tạo đơn thanh toán"
      );
    }
  }

  function startPollingOrder(idLichHen, orderId) {
    // clear nếu đang chạy
    if (pollTimers.current[orderId]) {
      clearInterval(pollTimers.current[orderId]);
    }
    pollTimers.current[orderId] = setInterval(async () => {
      try {
        const rs = await client.get(`/payments/${orderId}`);
        const p = rs?.data || {};
        if (p.status === "PAID") {
          clearInterval(pollTimers.current[orderId]);
          delete pollTimers.current[orderId];

          // cập nhật nhanh trạng thái
          setItems((prev) =>
            prev.map((it) =>
              it.idLichHen === idLichHen
                ? { ...it, payment: { ...(it.payment || {}), status: "PAID" } }
                : it
            )
          );

          // đồng bộ lại toàn bộ list
          load();
        }
      } catch {
        /* bỏ qua 1 tick lỗi */
      }
    }, 3000);
  }

  return (
    <div className="container py-4">
      <h2 className="mb-3">Tra Cứu Kết Quả / Lịch Hẹn & Thanh Toán</h2>

      {/* Bộ lọc */}
      <div className="card p-3 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label">Lọc theo ngày hẹn</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max="2999-12-31"
            />
            <div className="form-text">Để trống = tất cả ngày</div>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label d-block">&nbsp;</label>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="unpaidOnly"
                checked={unpaidOnly}
                onChange={(e) => setUnpaidOnly(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="unpaidOnly">
                Chỉ hiển thị lịch <b>chưa thanh toán</b>
              </label>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label d-block">&nbsp;</label>
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {!error && loading && <div className="alert alert-info">Đang tải dữ liệu…</div>}
      {!loading && !items.length && !error && (
        <div className="alert alert-secondary">Không có lịch hẹn nào.</div>
      )}

      <div className="d-flex flex-column gap-3">
        {items.map((appt) => {
          const p = appt.payment;
          const paid = p?.status === "PAID";
          const pending = p && p.status === "PENDING";
          const amount = p?.amount ?? appt.payAmount ?? appt.phiDaGiam ?? appt.phiKhamGoc;
          return (
            <div key={appt.idLichHen} className="card p-3">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <div className="me-3">
                  <div className="fw-bold fs-5">{appt.tenChuyenKhoa}</div>
                  <div>
                    Bác sĩ: <b>{appt.tenBacSi}</b>
                  </div>
                  <div>
                    Thời gian: <b>{(appt.gioHen || "").slice(0, 5)}</b> —{" "}
                    <b>{fmtDate(appt.ngayHen)}</b>
                  </div>
                  <div>
                    Giá: <b>{fmtMoney(appt.phiDaGiam ?? appt.phiKhamGoc)}</b>
                  </div>
                </div>

                <div className="text-end">
                  <div
                    className={cls(
                      "badge rounded-pill",
                      paid ? "bg-success" : "bg-warning text-dark"
                    )}
                  >
                    {paid
                      ? "Đã thanh toán"
                      : pending
                      ? "Đang chờ thanh toán"
                      : "Chưa thanh toán"}
                  </div>
                  <div className="small mt-2">
                    Mã tham chiếu: <code>{p?.referenceCode || "-"}</code>
                  </div>
                </div>
              </div>

              {/* QR / hành động */}
              <div className="mt-3 d-flex flex-wrap align-items-start gap-3">
                {pending && p?.qrUrl && (
                  <div>
                    <img
                      src={p.qrUrl}
                      alt="QR thanh toán"
                      style={{
                        width: 210,
                        height: 210,
                        objectFit: "contain",
                        borderRadius: 8,
                        border: "1px solid #eee",
                      }}
                    />
                    <div className="mt-2 text-center">
                      Số tiền: <b>{fmtMoney(amount)}</b>
                    </div>
                  </div>
                )}

                <div className="flex-grow-1">
                  {!paid && (
                    <button
                      className="btn btn-outline-primary me-2"
                      onClick={() => createOrShowPayment(appt)}
                    >
                      {pending ? "Hiển thị lại QR" : "Thanh toán"}
                    </button>
                  )}
                  {paid && (
                    <div className="text-success mt-2">
                      ✅ Thanh toán thành công!
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
