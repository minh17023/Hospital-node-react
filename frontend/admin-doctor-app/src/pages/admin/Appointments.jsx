import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

/* ===== helpers ===== */
const DEFAULT_LIMIT = 10;
const toHHMM = (t) => (t ? String(t).slice(0, 5) : "-");
const fmtMoney = (n) => (n == null ? "-" : Intl.NumberFormat().format(n));
const badge = (st) => {
  const s = Number(st);
  if (s === -1) return { text: "Đã hủy", cls: "secondary" };
  if (s === 1) return { text: "Đã đặt", cls: "warning" };
  if (s === 2) return { text: "Đang khám", cls: "primary" };
  if (s === 3) return { text: "Hoàn thành", cls: "success" };
  if (s === 5) return { text: "Không đến", cls: "dark" };
  return { text: String(st), cls: "secondary" };
};

/* Alert mini */
function AlertBanner({ show, type = "success", message, onClose }) {
  if (!show) return null;
  return (
    <div className={`alert alert-${type} alert-dismissible fade show`} role="alert">
      {message}
      <button type="button" className="btn-close" onClick={onClose}></button>
    </div>
  );
}

export default function AdminAppointments() {
  /* ===== Filters ===== */
  const [maBacSi, setMaBacSi] = useState("");
  const [ngay, setNgay] = useState("");
  const [status, setStatus] = useState(""); // "", -1,1,2,3,5

  /* ===== Paging ===== */
  const [limit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const [hasMore, setHasMore] = useState(false);

  /* ===== Data ===== */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ===== Modals ===== */
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editStatus, setEditStatus] = useState(1);
  const [saving, setSaving] = useState(false);

  /* ===== Alert ===== */
  const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
  const flash = (msg, type = "success", timeout = 2200) => {
    setAlert({ show: true, type, message: msg });
    if (timeout) setTimeout(() => setAlert((s) => ({ ...s, show: false })), timeout);
  };

  /* ===== Load (1 chỗ duy nhất) ===== */
  const runId = useRef(0);
  useEffect(() => {
    const id = ++runId.current;
    setLoading(true);
    (async () => {
      try {
        const { data } = await client.get("/appointments", {
          params: {
            maBacSi: maBacSi || undefined,
            ngay: ngay || undefined,
            status: status === "" ? undefined : status,
            limit,
            offset,
          },
        });
        if (id !== runId.current) return;
        const arr = data?.items || [];
        setItems(arr);
        setHasMore(arr.length === limit);
      } catch (e) {
        if (id !== runId.current) return;
        flash(e?.response?.data?.message || "Không tải được danh sách lịch hẹn", "danger");
      } finally {
        if (id === runId.current) setLoading(false);
      }
    })();
  }, [maBacSi, ngay, status, limit, offset]);

  /* ===== handlers ===== */
  const onSubmitFilters = (e) => {
    e.preventDefault();
    setOffset(0); // để effect tự load
  };
  const clearFilters = () => {
    setMaBacSi(""); setNgay(""); setStatus(""); setOffset(0);
  };

  const next = () => hasMore && setOffset((o) => o + limit);
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  async function openView(ma) {
    setViewId(ma); setViewData(null); setViewLoading(true);
    try {
      const { data } = await client.get(`/appointments/${encodeURIComponent(ma)}`);
      setViewData(data || null);
    } catch {
      setViewData(null);
    } finally {
      setViewLoading(false);
    }
  }
  function openEdit(row) {
    setEditId(row.maLichHen);
    setEditStatus(Number(row.trangThai));
  }
  async function saveEdit(e) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    try {
      await client.put(`/appointments/${encodeURIComponent(editId)}/status`, {
        trangThai: Number(editStatus),
      });
      setEditId(null);

      // reload hiện tại
      const id = ++runId.current;
      setLoading(true);
      const { data } = await client.get("/appointments", {
        params: { maBacSi: maBacSi || undefined, ngay: ngay || undefined, status: status === "" ? undefined : status, limit, offset }
      });
      if (id === runId.current) {
        setItems(data?.items || []);
        setHasMore((data?.items || []).length === limit);
      }
      flash("Đã cập nhật trạng thái");
    } catch (e2) {
      flash(e2?.response?.data?.message || "Cập nhật thất bại", "danger");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }

  return (
    <Layout>
      {/* Card full-height: phần bảng cuộn bên trong .table-zone */}
      <div className="card page-flex">
        <div className="card-body d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý lịch hẹn</h2>
          </div>

          {/* Alerts */}
          <AlertBanner
            show={alert.show}
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert((s) => ({ ...s, show: false }))}
          />

          {/* Filters — ngoài vùng scroll */}
          <form className="row g-2 mb-3 filters" onSubmit={onSubmitFilters}>
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Mã bác sĩ…"
                value={maBacSi}
                onChange={(e) => setMaBacSi(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control" value={ngay} onChange={(e) => setNgay(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="1">Đã đặt</option>
                <option value="2">Đang khám</option>
                <option value="3">Hoàn thành</option>
                <option value="5">Không đến</option>
                <option value="-1">Đã hủy</option>
              </select>
            </div>
            <div className="col-md-1 d-grid">
              <button className="btn btn-outline-secondary" type="submit">Tải</button>
            </div>
            <div className="col-md-1 d-grid">
              <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>Xóa</button>
            </div>
          </form>

          {/* ===== VÙNG BẢNG CUỘN ===== */}
          <div className="table-zone">
            <div className="table-responsive table-sticky">
              <table className="table table-hover align-middle mb-0 table-tight">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 120 }}>Mã lịch</th>
                    <th style={{ width: 110 }}>Mã BN</th>
                    <th>Bác sĩ</th>
                    <th style={{ width: 160 }}>Chuyên khoa</th>
                    <th style={{ width: 110 }}>Ngày</th>
                    <th style={{ width: 80 }}>Giờ</th>
                    <th style={{ width: 210 }}>Phòng / Ca</th>
                    <th style={{ width: 70 }} className="text-center">STT</th>
                    <th style={{ width: 120 }} className="text-center">Trạng thái</th>
                    <th style={{ width: 220 }} className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={10} className="py-4 text-center">
                        <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                      </td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr><td colSpan={10} className="text-center text-muted py-4">Chưa có dữ liệu</td></tr>
                  )}
                  {items.map((r) => {
                    const st = badge(r.trangThai);
                    const disableUpdate = Number(r.trangThai) === 3; // hoàn thành => khóa
                    return (
                      <tr key={r.maLichHen}>
                        <td><span className="badge bg-secondary">{r.maLichHen}</span></td>
                        <td className="text-nowrap">{r.maBenhNhan}</td>
                        <td className="text-nowrap">{r.tenBacSi || "-"}</td>
                        <td className="text-nowrap">{r.tenChuyenKhoa || "-"}</td>
                        <td className="text-nowrap">{r.ngayHen}</td>
                        <td className="text-nowrap">{toHHMM(r.gioHen)}</td>
                        <td className="text-nowrap">{(r.tenPhongKham || "-")} / {r.tenCaLamViec || "-"}</td>
                        <td className="text-center">{r.sttKham ?? "-"}</td>
                        <td className="text-center"><span className={`badge bg-${st.cls}`}>{st.text}</span></td>
                        <td className="text-end text-nowrap">
                          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openView(r.maLichHen)}>Xem</button>
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            disabled={disableUpdate}
                            title={disableUpdate ? "Đã hoàn thành - không thể cập nhật" : ""}
                            onClick={() => openEdit(r)}
                          >
                            Cập nhật
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={Number(r.trangThai) === -1 || Number(r.trangThai) === 3}
                            onClick={async () => {
                              try {
                                await client.put(`/appointments/${encodeURIComponent(r.maLichHen)}/cancel-by-doctor`);
                                flash("Đã hủy lịch hẹn");
                                setOffset((o) => o); // giữ trang và reload
                              } catch (e) {
                                flash(e?.response?.data?.message || "Hủy thất bại", "danger");
                              }
                            }}
                          >
                            Hủy
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== Pagination — ĐẶT NGOÀI .table-zone ===== */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">Trang {page}</small>
            <div>
              <button className="btn btn-outline-secondary me-2" disabled={offset <= 0} onClick={prev}>← Trước</button>
              <button className="btn btn-outline-secondary" disabled={!hasMore} onClick={next}>Sau →</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== View Modal ===== */}
      {viewId && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Chi tiết lịch hẹn #{viewId}</h5>
                  <button type="button" className="btn-close" onClick={() => setViewId(null)} />
                </div>
                <div className="modal-body modal-scroll">
                  {viewLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                    </div>
                  ) : !viewData ? (
                    <div className="alert alert-danger mb-0">Không tải được dữ liệu.</div>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-6"><strong>Mã lịch:</strong> {viewData.maLichHen}</div>
                      <div className="col-md-6"><strong>Mã BN:</strong> {viewData.maBenhNhan}</div>
                      <div className="col-md-6"><strong>Bác sĩ:</strong> {viewData.tenBacSi || "-"}</div>
                      <div className="col-md-6"><strong>Chuyên khoa:</strong> {viewData.tenChuyenKhoa || "-"}</div>
                      <div className="col-md-4"><strong>Ngày:</strong> {viewData.ngayHen}</div>
                      <div className="col-md-4"><strong>Giờ:</strong> {toHHMM(viewData.gioHen)}</div>
                      <div className="col-md-4"><strong>STT:</strong> {viewData.sttKham ?? "-"}</div>
                      <div className="col-md-6"><strong>Phòng khám:</strong> {viewData.tenPhongKham || "-"}</div>
                      <div className="col-md-6"><strong>Ca làm việc:</strong> {viewData.tenCaLamViec || "-"}</div>
                      <div className="col-md-6"><strong>Phí gốc:</strong> {fmtMoney(viewData.phiKhamGoc)}</div>
                      <div className="col-md-6"><strong>Phí đã giảm:</strong> {fmtMoney(viewData.phiDaGiam)}</div>
                      <div className="col-md-12">
                        <strong>Trạng thái:</strong>{" "}
                        <span className={`badge bg-${badge(viewData.trangThai).cls}`}>{badge(viewData.trangThai).text}</span>
                      </div>
                      <div className="col-12"><strong>Lý do/ghi chú:</strong> {viewData.lyDoKham || "-"}</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer justify-content-center">
                  <button className="btn btn-outline-secondary" onClick={() => setViewId(null)}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setViewId(null)} />
        </>
      )}

      {/* ===== Edit Modal ===== */}
      {editId && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-dialog-centered">
              <form className="modal-content" onSubmit={saveEdit}>
                <div className="modal-header">
                  <h5 className="modal-title">Cập nhật trạng thái</h5>
                  <button type="button" className="btn-close" onClick={() => setEditId(null)} />
                </div>
                <div className="modal-body">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(Number(e.target.value))}>
                    <option value={1}>Đã đặt</option>
                    <option value={2}>Đang khám</option>
                    <option value={3}>Hoàn thành</option>
                    <option value={5}>Không đến</option>
                    <option value={-1}>Đã hủy</option>
                  </select>
                </div>
                <div className="modal-footer justify-content-center">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEditId(null)}>Hủy</button>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setEditId(null)} />
        </>
      )}
    </Layout>
  );
}
