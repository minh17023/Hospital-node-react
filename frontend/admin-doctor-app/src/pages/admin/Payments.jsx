import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

/* ===== helpers ===== */
const fmtMoney = (n) => Intl.NumberFormat().format(Number(n || 0));
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "-");
const toBadge = (st) =>
  Number(st) === 1
    ? { cls: "success", text: "ĐÃ THANH TOÁN" }
    : { cls: "warning", text: "CHỜ THANH TOÁN" };

/* ===== Modal chi tiết ===== */
function DetailModal({ data, onClose, onRefresh, loading }) {
  if (!data && !loading) return null;
  const st = toBadge(data?.trangThai ?? 0);

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Đơn {data?.maDonHang || ""}</h5>
              <button className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {loading ? (
                <div className="py-4 text-center">
                  <div className="spinner-border" role="status" />
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-4 d-flex justify-content-center">
                    {data?.qrUrl ? (
                      <img
                        src={data.qrUrl}
                        alt="QR thanh toán"
                        style={{ width: 220, height: 220, objectFit: "contain", borderRadius: 8, border: "1px solid #eee" }}
                      />
                    ) : (
                      <div
                        className="text-muted d-flex align-items-center justify-content-center"
                        style={{ width: 220, height: 220, border: "1px dashed #ccc", borderRadius: 8 }}
                      >
                        Chưa có QR
                      </div>
                    )}
                  </div>
                  <div className="col-md-8">
                    <div className="mb-2">
                      <strong>Trạng thái:</strong>{" "}
                      <span className={`badge bg-${st.cls}`}>{st.text}</span>
                    </div>
                    <div className="mb-2"><strong>Mã lịch hẹn:</strong> {data?.maLichHen || "-"}</div>
                    <div className="mb-2"><strong>Số tiền:</strong> {fmtMoney(data?.soTien)} đ</div>
                    <div className="mb-2"><strong>Ghi chú:</strong> {data?.ghiChu || "-"}</div>
                    <div className="text-muted small">
                      <div><strong>Tạo lúc:</strong> {fmtDateTime(data?.createdAt)}</div>
                      <div><strong>Thanh toán lúc:</strong> {fmtDateTime(data?.paidAt)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer justify-content-center">
              <button className="btn btn-outline-secondary" onClick={onClose}>Đóng</button>
              <button className="btn btn-primary" onClick={onRefresh} disabled={loading}>
                {loading ? "Đang lấy…" : "Làm mới"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

/* ===== Page ===== */
export default function AdminPayments() {
  // filters (auto-load)
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | "0" | "1"
  const [qDebounced, setQDebounced] = useState("");

  // paging
  const [limit] = useState(12);
  const [offset, setOffset] = useState(0);
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // detail
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // alert
  const [alertMsg, setAlertMsg] = useState("");

  // guards
  const runId = useRef(0);
  const typingTimer = useRef(null);
  const [rowLoadingId, setRowLoadingId] = useState(null);

  // debounce input q
  useEffect(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => typingTimer.current && clearTimeout(typingTimer.current);
  }, [q]);

  // ✅ chỉ 1 effect load list
  useEffect(() => {
    const id = ++runId.current;
    setLoading(true);
    (async () => {
      try {
        const { data } = await client.get("/payments", {
          params: {
            q: qDebounced || undefined,
            status: status === "ALL" ? undefined : Number(status),
            limit,
            offset,
          },
        });
        if (id !== runId.current) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items.map((r) => ({
          maDonHang: r.maDonHang,
          maLichHen: r.maLichHen,
          soTien: r.soTien,
          trangThai: Number(r.trangThai),   // 0/1
          createdAt: r.createdAt || null,   // 👈 dùng cho cột “Tạo lúc”
        })));
        setTotal(Number(data?.total || 0));
      } catch (e) {
        if (id !== runId.current) return;
        setAlertMsg(e?.response?.data?.message || "Không tải được danh sách đơn");
      } finally {
        if (id === runId.current) setLoading(false);
      }
    })();
    return () => { runId.current++; };
  }, [qDebounced, status, limit, offset]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const next = () => setOffset((o) => Math.min(o + limit, Math.max(0, (totalPages - 1) * limit)));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  function clearFilters() {
    setQ(""); setStatus("ALL"); setOffset(0);
  }

  async function openDetail(maDonHang) {
    setRowLoadingId(maDonHang);
    setDetailLoading(true);
    try {
      const { data } = await client.get(`/payments/${encodeURIComponent(maDonHang)}`);
      setDetail({
        maDonHang: data.maDonHang,
        maLichHen: data.maLichHen || null,
        trangThai: Number(data.trangThai || 0),
        qrUrl: data.qrUrl || "",
        ghiChu: data.ghiChu || "",
        createdAt: data.createdAt || null,
        paidAt: data.paidAt || null,
        soTien: data.soTien || 0,
      });
    } catch (e) {
      setAlertMsg(e?.response?.data?.message || "Không tải được thông tin đơn");
    } finally {
      setDetailLoading(false);
      setRowLoadingId(null);
    }
  }

  return (
    <Layout>
      {/* Card full-height, bảng cuộn bên trong (giống các trang đã fix) */}
      <div className="card page-flex">
        <div className="card-body d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý thanh toán</h2>
          </div>

          {/* Alert */}
          {alertMsg && (
            <div className="alert alert-info alert-dismissible fade show" role="alert">
              {alertMsg}
              <button type="button" className="btn-close" onClick={() => setAlertMsg("")} />
            </div>
          )}

          {/* Filters — đặt ngoài vùng cuộn */}
          <div className="row g-2 mb-3">
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder="Tìm (mã đơn / reference / LHxxx / CCCD)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="0">Chờ thanh toán</option>
                <option value="1">Đã thanh toán</option>
              </select>
            </div>
            <div className="col-md-2 d-flex">
              <button type="button" className="btn btn-outline-dark ms-auto" onClick={clearFilters}>
                Xóa lọc
              </button>
            </div>
          </div>

          {/* ===== VÙNG BẢNG CUỘN ===== */}
          <div className="table-zone">
            <div className="table-responsive table-sticky">
              <table className="table table-hover align-middle mb-0 table-tight">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 150 }}>Mã đơn</th>
                    <th style={{ width: 150 }}>Mã lịch hẹn</th>
                    <th style={{ width: 160 }}>Tạo lúc</th>     {/* 👈 cột mới */}
                    <th style={{ width: 140 }}>Số tiền</th>
                    <th style={{ width: 160 }}>Trạng thái</th>
                    <th className="text-end" style={{ width: 150 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center">
                        <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">Chưa có đơn nào</td></tr>
                  ) : (
                    rows.map((r) => {
                      const st = toBadge(r.trangThai);
                      return (
                        <tr key={r.maDonHang}>
                          <td><span className="badge bg-secondary">{r.maDonHang}</span></td>
                          <td className="text-nowrap">{r.maLichHen || "-"}</td>
                          <td className="text-nowrap">{fmtDateTime(r.createdAt)}</td>
                          <td className="text-nowrap">{fmtMoney(r.soTien)} đ</td>
                          <td><span className={`badge bg-${st.cls}`}>{st.text}</span></td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openDetail(r.maDonHang)}
                              disabled={rowLoadingId === r.maDonHang}
                            >
                              {rowLoadingId === r.maDonHang ? "Đang tải…" : "Xem thông tin"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination — đặt ngoài vùng cuộn */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">Tổng: {total} • Trang {page}/{Math.max(1, Math.ceil(total / limit))}</small>
            <div>
              <button className="btn btn-outline-secondary me-2" disabled={page <= 1} onClick={prev}>← Trước</button>
              <button className="btn btn-outline-secondary" disabled={page >= Math.max(1, Math.ceil(total / limit))} onClick={next}>Sau →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal chi tiết */}
      <DetailModal
        data={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onRefresh={() => detail?.maDonHang && openDetail(detail.maDonHang)}
      />
    </Layout>
  );
}
