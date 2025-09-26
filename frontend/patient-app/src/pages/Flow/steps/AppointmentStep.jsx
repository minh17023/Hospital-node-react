// src/pages/Flow/steps/AppointmentStep.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import client from "../../../api/client";
import Stepper from "../../../components/Stepper/Stepper";
import s from "./AppointmentStep.module.css";

const getFromSS = (k, d=null) => {
  try { return JSON.parse(sessionStorage.getItem(k) || "null") ?? d; }
  catch { return d; }
};
const getPatient = () => {
  try { return JSON.parse(localStorage.getItem("PATIENT_INFO") || "null"); }
  catch { return null; }
};

// Chuẩn hoá bản ghi DonHang (BE) -> object payment (FE)
function normalizeOrder(row) {
  if (!row) return null;
  return {
    id: row.idDonHang,
    status: Number(row.trangThai) === 1 ? "PAID" : "PENDING",
    amount: Number(row.soTien || 0),
    qrUrl: row.qrUrl || "",
    // Hiển thị nội dung CK: ưu tiên referenceCode + LH + CCCD
    transferContent: row.referenceCode
      ? `${row.referenceCode} LH${row.idLichHen} ${row.soCCCD ? `CCCD:${row.soCCCD}` : ""}`.trim()
      : (row.ghiChu || ""),
    paidAt: row.paidAt || null,
    // BE chưa có expireAt -> vẫn map nếu sau này bổ sung cột/field
    expireAt: row.expireAt || null,
  };
}

export default function AppointmentStep() {
  const { mode } = useParams(); // "bhyt" | "service" | "booking"
  const navigate = useNavigate();
  const q = new URLSearchParams(useLocation().search);
  const idFromQuery = q.get("id");

  const [loading, setLoading] = useState(true);
  const [appt, setAppt] = useState(null);
  const [error, setError] = useState("");

  // payment states
  const [payInitLoading, setPayInitLoading] = useState(true);
  const [payment, setPayment] = useState(null); // {id,status,amount,expireAt,qrUrl,transferContent,...}
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [countdown, setCountdown] = useState("--:--");
  const [payError, setPayError] = useState("");

  const pollRef = useRef(null);
  const countdownRef = useRef(null);

  const patient = useMemo(() => getPatient(), []);
  const pickedService = useMemo(() => getFromSS("SELECTED_SERVICE", null), []);
  const resultCache = useMemo(() => getFromSS("APPOINTMENT_RESULT", null), []);

  /* ========== 1) Load appointment ========== */
  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        let data = null;
        if (idFromQuery) {
          const rs = await client.get(`/appointments/${idFromQuery}`);
          data = rs?.data;
        } else if (resultCache?.idLichHen) {
          const rs = await client.get(`/appointments/${resultCache.idLichHen}`);
          data = rs?.data;
        } else {
          throw new Error("Không tìm thấy lịch hẹn vừa tạo.");
        }
        setAppt(data);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Lỗi tải lịch hẹn");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      clearInterval(pollRef.current);
      clearInterval(countdownRef.current);
    };
  }, [idFromQuery, resultCache?.idLichHen]);

  /* ========== 2) Khi có appointment -> init/tái sử dụng order ========== */
  useEffect(() => {
    if (!appt?.idLichHen) return;

    // đã thanh toán server-side rồi
    if (Number(appt?.trangThai) === 2) {
      setPaid(true);
      setPayment(null);
      setPayInitLoading(false);
      setExpired(false);
      setCountdown("--:--");
      clearInterval(pollRef.current);
      clearInterval(countdownRef.current);
      return;
    }

    startPayment(appt.idLichHen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.idLichHen]);

  async function startPayment(idLichHen) {
    try {
      setPayError("");
      setPayInitLoading(true);
      setExpired(false);
      setPaid(false);
      setPayment(null);
      setCountdown("--:--");
      clearInterval(pollRef.current);
      clearInterval(countdownRef.current);

      // Server dùng order pending còn hạn (nếu có) hoặc tạo mới
      const { data } = await client.post("/payments", { idLichHen });
      const order = normalizeOrder(data);
      setPayment(order);

      // Bắt đầu đếm ngược (nếu server trả expireAt)
      if (order?.expireAt) startCountdown(order.expireAt);

      // Poll trạng thái
      pollRef.current = setInterval(async () => {
        try {
          const rs = await client.get(`/payments/${order.id}`);
          const p = normalizeOrder(rs?.data || {});
          // cập nhật trạng thái
          setPayment(prev => ({ ...(prev || {}), status: p.status, paidAt: p.paidAt }));
          if (p.status === "PAID") {
            setPaid(true);
            clearInterval(pollRef.current);
            clearInterval(countdownRef.current);
            // đồng bộ lại appointment
            try {
              const rs2 = await client.get(`/appointments/${idLichHen}`);
              setAppt(rs2?.data);
            } catch {}
          } else if (order?.expireAt) {
            // kiểm tra hết hạn nếu có expireAt
            const nowMs = Date.now();
            const expMs = toMs(order.expireAt);
            if (expMs && nowMs >= expMs) {
              setExpired(true);
              clearInterval(pollRef.current);
              clearInterval(countdownRef.current);
            }
          }
        } catch {
          // bỏ qua tick lỗi
        }
      }, 3000);
    } catch (e) {
      setPayError(e?.response?.data?.message || e?.message || "Không thể tạo đơn thanh toán");
    } finally {
      setPayInitLoading(false);
    }
  }

  function toMs(dtStr) {
    if (!dtStr) return null;
    const iso = dtStr.includes("T") ? dtStr : dtStr.replace(" ", "T");
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
  }

  function startCountdown(expireAtStr) {
    const tick = () => {
      const end = toMs(expireAtStr);
      if (!end) { setCountdown("--:--"); return; }
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const mm = String(Math.floor(diff / 60)).padStart(2, "0");
      const ss = String(diff % 60).padStart(2, "0");
      setCountdown(`${mm}:${ss}`);
      if (diff <= 0) {
        setExpired(true);
        clearInterval(countdownRef.current);
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  }

  const onPrint = () => window.print();
  const goHome = () => navigate("/menu");

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className={s.shell}>
          <Stepper step={3}/>
          <div className={s.loading}>Đang tải phiếu hẹn…</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className={s.shell}>
          <Stepper step={3}/>
          <div className={s.error}>
            {error}
            <div className="mt-3">
              <button className="btn btn-primary" onClick={goHome}>Về trang chính</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!appt) return null;

  /* ========== Giá hiển thị (ưu tiên server) ========== */
  const baseFee = Number(appt.phiKhamGoc ?? pickedService?.price ?? 0);
  const priceShow = Number(
    appt.phiDaGiam ?? pickedService?.priceInfo?.total ?? baseFee
  );
  const discountNote =
    appt.phiDaGiam != null && appt.phiDaGiam !== baseFee
      ? "Áp dụng giảm 50% BHYT"
      : (pickedService?.priceInfo?.note || "");

  const bn = patient || {};
  const svName = pickedService?.name || appt.tenChuyenKhoa || "--";
  const roomName = pickedService?.clinic?.name || appt.tenPhongKham || "--";
  const bsName = appt.tenBacSi || (pickedService?.clinic?.doctorNames?.[0]) || "--";

  return (
    <div className="container-fluid py-4">
      <div className={s.shell}>
        <Stepper step={3}/>
        <div className={s.title}>Hoàn Thành Đăng Ký</div>
        <div className={s.subtitle}>Kiểm tra thông tin và in phiếu khám</div>

        <div className={s.grid}>
          {/* Thông tin bệnh nhân */}
          <div className={s.card}>
            <div className={s.cardHead}>Thông Tin Bệnh Nhân</div>
            <div className={s.row}><span>Họ tên:</span><b>{bn.hoTen || appt.tenBenhNhan || "--"}</b></div>
            <div className={s.row}><span>CCCD:</span><b>{bn.soCCCD || "--"}</b></div>
            <div className={s.row}><span>Ngày sinh:</span><b>{bn.ngaySinh || "--"}</b></div>
            <div className={s.row}><span>Giới tính:</span><b>{bn.gioiTinh === "F" ? "Nữ" : bn.gioiTinh === "M" ? "Nam" : "--"}</b></div>
            <div className={s.row}><span>SDT:</span><b>{bn.soDienThoai || "--"}</b></div>
          </div>

          {/* Thông tin khám */}
          <div className={s.card}>
            <div className={s.cardHead}>Thông Tin Khám</div>
            <div className={s.row}><span>Dịch vụ:</span><b>{svName}</b></div>
            <div className={s.row}><span>Phòng:</span><b>{roomName}</b></div>
            <div className={s.row}><span>Bác sĩ:</span><b>{bsName}</b></div>
            <div className={s.row}><span>Số thứ tự:</span><b>{appt.sttKham ?? "--"}</b></div>

            <div className={s.row}>
              <span>Giá:</span>
              <b>
                {priceShow.toLocaleString("vi-VN")} đ
                {discountNote ? <span className={s.note}>&nbsp;({discountNote})</span> : null}
              </b>
            </div>

            <div className={s.row}>
              <span>Thời gian:</span>
              <b>{appt.gioHen?.slice(0,5)} {formatDateVN(appt.ngayHen)}</b>
            </div>

            <div className={s.row}><span>Trạng thái thanh toán:</span>
              {paid ? (
                <b className={s.badgeSuccess}>Đã thanh toán</b>
              ) : (
                <b className={s.badgeDanger}>Đang chờ thanh toán</b>
              )}
            </div>
          </div>

          {/* QR Thanh toán */}
          <div className={s.qrCard}>
            <div className={s.qrTitle}>QR thanh toán</div>

            {payInitLoading ? (
              <div className={s.loading}>Đang tạo mã thanh toán…</div>
            ) : paid ? (
              <div className={s.paidBox}>✅ Thanh toán thành công!</div>
            ) : payError ? (
              <div className={s.error}>{payError}</div>
            ) : payment ? (
              <>
                <img className={s.qrImg} alt="QR thanh toán" src={payment.qrUrl} />
                <div className={s.qrMeta}>
                  <div>Số tiền: <b>{Number(payment.amount).toLocaleString("vi-VN")} đ</b></div>
                  <div>Nội dung CK: <code>{payment.transferContent}</code></div>
                  {payment.expireAt ? (
                    !expired ? <div>Hết hạn sau: <b>{countdown}</b></div>
                              : <div className={s.warn}>Mã đã hết hạn</div>
                  ) : null}
                </div>
                <div className="mt-2">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!expired}
                    onClick={() => startPayment(appt.idLichHen)}
                  >
                    {expired ? "Tạo lại mã QR" : "Đang hiệu lực"}
                  </button>
                </div>
              </>
            ) : (
              <div className={s.error}>Không thể tạo đơn thanh toán</div>
            )}
          </div>
        </div>

        <div className={s.actions}>
          <button className="btn btn-secondary" onClick={goHome}>Về trang chủ</button>
          <button className="btn btn-primary" onClick={onPrint}>In Phiếu Khám</button>
        </div>

        <div className={s.help}>
          <ul>
            <li>Vui lòng hoàn tất thanh toán trước khi in phiếu khám.</li>
            <li>Đến phòng khám đúng giờ hẹn.</li>
            <li>Mang theo phiếu khám và giấy tờ tuỳ thân.</li>
            <li>Liên hệ tổng đài nếu cần hỗ trợ.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function formatDateVN(d) {
  if (!d) return "--";
  const [y,m,dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}
