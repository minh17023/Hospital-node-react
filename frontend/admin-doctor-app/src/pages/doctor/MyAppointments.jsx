// frontend/admin-doctor-app/src/pages/doctor/MyAppointments.jsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

function getME() {
  try { return JSON.parse(localStorage.getItem("ME") || "null"); }
  catch { return null; }
}

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("vi-VN");
};
const fmtTime = (t) => (t ? String(t).slice(0, 5) : "");

/** Map hiển thị theo yêu cầu:
 * -1 Hủy hẹn, 1 Đã đặt lịch, 2 Đã xác nhận, 3 Đang khám, 5 Đã khám
 */
const STATUS_MAP = {
  "-1": { text: "Hủy hẹn",       cls: "badge bg-secondary" },
   "1": { text: "Đã đặt lịch",   cls: "badge bg-info" },
   "2": { text: "Đã xác nhận",   cls: "badge bg-primary" },
   "3": { text: "Đang khám",     cls: "badge bg-warning text-dark" },
   "5": { text: "Đã khám",       cls: "badge bg-success" },
};
const StatusChip = ({ v }) => {
  const k = String(v);
  const m = STATUS_MAP[k] || { text: k, cls: "badge bg-light text-dark" };
  return <span className={m.cls}>{m.text}</span>;
};

export default function MyAppointments() {
  const me = useMemo(() => getME() || {}, []);
  const [maBacSi, setMaBacSi] = useState(me?.mabacsi || "");

  // filters
  const [ngay, setNgay] = useState("");
  const [status, setStatus] = useState(""); // "", -1,1,2,3,5
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  // data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // detail modal
  const [active, setActive] = useState(null);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  // Nếu chưa có mã bác sĩ trong ME thì lấy qua /doctors/by-user/:maUser
  useEffect(() => {
    if (maBacSi || !me?.maUser) return;
    (async () => {
      try {
        const { data } = await client.get(`/doctors/by-user/${me.maUser}`);
        setMaBacSi(data.maBacSi);
      } catch (e) {
        setError(e?.response?.data?.message || "Không xác định được mã bác sĩ.");
      }
    })();
  }, [me?.maUser]); // eslint-disable-line

  async function fetchList() {
    if (!maBacSi) return;
    setLoading(true);
    setError("");
    try {
      const params = {
        maBacSi,
        ngay: ngay || undefined,
        status: status === "" ? undefined : Number(status),
        limit,
        offset,
      };
      const { data } = await client.get("/appointments", { params });
      const items = data?.items || [];
      setRows(items);
      // API không trả total -> ước lượng để phân trang mượt
      setTotal(items.length < limit ? offset + items.length : offset + limit + 1);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e?.response?.data?.message || "Không thể tải danh sách lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); },
    [maBacSi, ngay, status, limit, offset]); // eslint-disable-line

  const goto = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  async function openDetail(row) {
    try {
      const { data } = await client.get(`/appointments/${row.maLichHen}`);
      setActive(data);
    } catch (e) {
      setActive({ error: e?.response?.data?.message || "Không tải được chi tiết." });
    }
  }

  async function changeStatus(row, newStatus) {
    if (!window.confirm(`Xác nhận đổi trạng thái lịch ${row.maLichHen} → ${STATUS_MAP[String(newStatus)]?.text || newStatus}?`)) return;
    try {
      await client.put(`/appointments/${row.maLichHen}/status`, { trangThai: newStatus });
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || "Đổi trạng thái thất bại");
    }
  }

  async function cancelAppt(row) {
    if (!window.confirm(`Hủy lịch ${row.maLichHen}?`)) return;
    try {
      await client.put(`/appointments/${row.maLichHen}/cancel-by-doctor`);
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.message || "Hủy lịch thất bại");
    }
  }

  // Chỉ cho bảng scroll: chiều cao khả dụng = viewport - (header trang + filter + khoảng đệm)
  const TABLE_MAX_H = "calc(100vh - 330px)";

  return (
    <Layout>
      {/* Không set overflow cho toàn trang để tránh có thanh scroll ở page */}
      <div className="container-fluid py-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="mb-0">Lịch hẹn của tôi</h4>
        </div>

        {/* Filters (cố định, không scroll) */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-12 col-md-3">
                <label className="form-label mb-1">Mã bác sĩ</label>
                <input className="form-control" value={maBacSi || ""} disabled />
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label mb-1">Ngày hẹn</label>
                <input
                  type="date"
                  className="form-control"
                  value={ngay}
                  onChange={(e) => { setNgay(e.target.value); setPage(1); }}
                />
              </div>

              {/* NEW: Bộ lọc trạng thái */}
              <div className="col-6 col-md-3">
                <label className="form-label mb-1">Trạng thái</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e)=>{ setStatus(e.target.value); setPage(1); }}
                >
                  <option value="">Tất cả</option>
                  <option value="-1">Hủy hẹn</option>
                  <option value="1">Đã đặt lịch</option>
                  <option value="2">Đã xác nhận</option>
                  <option value="3">Đang khám</option>
                  <option value="5">Đã khám</option>
                </select>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label mb-1">Hiển thị</label>
                <select
                  className="form-select"
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}/trang</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-3 d-flex align-items-end">
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => { setNgay(""); setStatus(""); setPage(1); }}
                >
                  Xóa lọc
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Table: chỉ phần dữ liệu (div.table-responsive) được scroll theo chiều dọc */}
        <div className="card">
          <div className="table-responsive" style={{ maxHeight: TABLE_MAX_H, overflowY: "auto" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th>Mã LH</th>
                  <th>Bệnh nhân</th>
                  <th className="text-nowrap">Ngày / Giờ</th>
                  <th>STT</th>
                  <th>Chuyên khoa</th>
                  <th className="d-none d-lg-table-cell">Phòng</th>
                  <th className="d-none d-xl-table-cell">Ca</th>
                  <th>Hình thức</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-4">
                      <div className="spinner-border" role="status" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-muted py-4">
                      Không có lịch hẹn
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.maLichHen}>
                      <td className="fw-semibold">{r.maLichHen}</td>
                      <td>
                        <div className="fw-semibold">{r.tenBenhNhan || r.maBenhNhan}</div>
                        <div className="text-muted small">{r.maBenhNhan}</div>
                      </td>
                      <td className="text-nowrap">
                        <div>{fmtDate(r.ngayHen)}</div>
                        <div className="text-muted small">{fmtTime(r.gioHen)}</div>
                      </td>
                      <td>{r.sttKham ?? "-"}</td>
                      <td>{r.tenChuyenKhoa || r.maChuyenKhoa}</td>
                      <td className="d-none d-lg-table-cell">{r.tenPhongKham || "-"}</td>
                      <td className="d-none d-xl-table-cell">{r.tenCaLamViec || "-"}</td>
                      <td>{Number(r.hinhThuc) === 1 ? "Trực tiếp" : "Đặt online"}</td>
                      <td><StatusChip v={r.trangThai} /></td>
                      <td className="text-end">
                        <div className="btn-group">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openDetail(r)}>
                            Chi tiết
                          </button>
                          <button className="btn btn-sm btn-outline-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" />
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li><button className="dropdown-item" onClick={() => changeStatus(r, 1)}>Đã đặt lịch</button></li>
                            <li><button className="dropdown-item" onClick={() => changeStatus(r, 2)}>Đã xác nhận</button></li>
                            <li><button className="dropdown-item" onClick={() => changeStatus(r, 3)}>Đang khám</button></li>
                            <li><button className="dropdown-item" onClick={() => changeStatus(r, 5)}>Đã khám</button></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li><button className="dropdown-item text-danger" onClick={() => cancelAppt(r)}>Hủy lịch</button></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang — luôn hiển thị, KHÔNG cuộn */}
          <div className="card-footer d-flex flex-wrap align-items-center gap-2 justify-content-between">
            <div className="text-muted small">
              Trang {page}/{totalPages} · Hiển thị {rows.length}
            </div>
            <nav>
              <ul className="pagination mb-0">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(1)}>«</button>
                </li>
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(page - 1)}>‹</button>
                </li>
                <li className="page-item active">
                  <span className="page-link">{page}</span>
                </li>
                <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(page + 1)}>›</button>
                </li>
                <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(totalPages)}>»</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Modal chi tiết */}
        <div
          className={`modal ${active ? "show d-block" : ""}`}
          tabIndex="-1"
          style={{ background: active ? "rgba(0,0,0,.5)" : "transparent" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết lịch hẹn</h5>
                <button type="button" className="btn-close" onClick={() => setActive(null)}></button>
              </div>
              <div className="modal-body">
                {!active ? null : active.error ? (
                  <div className="alert alert-danger">{active.error}</div>
                ) : (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="mb-2"><strong>Mã lịch hẹn:</strong> {active.maLichHen}</div>
                      <div className="mb-2"><strong>Bệnh nhân:</strong> {active.tenBenhNhan || active.maBenhNhan}</div>
                      <div className="mb-2"><strong>Ngày / Giờ:</strong> {fmtDate(active.ngayHen)} {fmtTime(active.gioHen)}</div>
                      <div className="mb-2"><strong>STT khám:</strong> {active.sttKham ?? "-"}</div>
                      <div className="mb-2"><strong>Trạng thái:</strong> <span className="ms-1"><StatusChip v={active.trangThai} /></span></div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-2"><strong>Bác sĩ:</strong> {active.tenBacSi}</div>
                      <div className="mb-2"><strong>Chuyên khoa:</strong> {active.tenChuyenKhoa}</div>
                      <div className="mb-2"><strong>Phòng khám:</strong> {active.tenPhongKham || "-"}</div>
                      <div className="mb-2"><strong>Ca làm việc:</strong> {active.tenCaLamViec || "-"}</div>
                      <div className="mb-2"><strong>Hình thức:</strong> {Number(active.hinhThuc) === 1 ? "Trực tiếp" : "Đặt online"}</div>
                    </div>
                    <div className="col-12">
                      <div className="mb-2"><strong>Lý do khám:</strong> {active.lyDoKham || "-"}</div>
                      <div className="mb-2"><strong>Phí khám (gốc/đã giảm):</strong> {active.phiKhamGoc ?? 0} / {active.phiDaGiam ?? 0}</div>
                      <div className="text-muted small">Tạo lúc: {fmtDate(active.ngayTao)}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setActive(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
