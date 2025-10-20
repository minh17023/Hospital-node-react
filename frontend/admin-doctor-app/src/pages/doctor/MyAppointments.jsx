import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

function getME() {
  try { return JSON.parse(localStorage.getItem("ME") || "null"); }
  catch { return null; }
}

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("vi-VN");
};
const fmtTime = (t) => (t ? String(t).slice(0, 5) : "-");

/** Map hiển thị:
 * -1 Hủy hẹn, 1 Đã đặt lịch, 2 Đang khám, 3 Đã khám, 5 Không đến
 */
const STATUS_MAP = {
  "-1": { text: "Hủy hẹn",     cls: "badge bg-secondary" },
   "1": { text: "Đã đặt lịch", cls: "badge bg-info" },
   "2": { text: "Đang khám",   cls: "badge bg-primary" },
   "3": { text: "Đã khám",     cls: "badge bg-warning text-dark" },
   "5": { text: "Không đến",   cls: "badge bg-success" },
};
const StatusChip = ({ v }) => {
  const m = STATUS_MAP[String(v)] || { text: v, cls: "badge bg-light text-dark" };
  return <span className={m.cls}>{m.text}</span>;
};

export default function MyAppointments() {
  const me = useMemo(() => getME() || {}, []);
  const [maBacSi, setMaBacSi] = useState(me?.mabacsi || me?.maBacSi || "");

  // filters
  const [ngay, setNgay] = useState("");
  const [status, setStatus] = useState(""); // "", -1,1,2,3,5

  // paging: cố định 10/trang
  const limit = 10;
  const [page, setPage] = useState(1);

  // data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // detail modal
  const [active, setActive] = useState(null);

  const offset = (page - 1) * limit;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const goto = (p) => setPage(Math.min(Math.max(1, p), totalPages));

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
      // API không trả total: ước lượng để phân trang mượt mà
      setTotal(items.length < limit ? offset + items.length : offset + limit + 1);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e?.response?.data?.message || "Không thể tải danh sách lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, [maBacSi, ngay, status, page]); // eslint-disable-line

  async function openDetail(row) {
    try {
      const { data } = await client.get(`/appointments/${row.maLichHen}`);
      setActive(data);
    } catch (e) {
      setActive({ error: e?.response?.data?.message || "Không tải được chi tiết." });
    }
  }

  async function changeStatus(row, newStatus) {
    const label = STATUS_MAP[String(newStatus)]?.text || newStatus;
    if (!window.confirm(`Xác nhận đổi trạng thái lịch ${row.maLichHen} → ${label}?`)) return;
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

  const clearFilters = () => {
    setNgay(""); setStatus(""); setPage(1);
  };

  return (
    <Layout>
      {/* ===== Styles full-height + bảng cuộn, thead sticky ===== */}
      <style>{`
        .page-flex{display:flex;flex-direction:column;height:calc(100vh - 90px);min-height:0}
        .table-zone{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
        .table-scroll{flex:1 1 auto;min-height:0;overflow:auto;border-radius:.25rem}
        .table-tight th,.table-tight td{padding-top:.6rem;padding-bottom:.6rem;vertical-align:middle}
        .table-scroll thead th{position:sticky;top:0;z-index:1;background:var(--bs-light)}
      `}</style>

      <div className="card page-flex">
        <div className="card-body d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="m-0">Lịch hẹn của tôi</h2>
          </div>

          {/* Filters */}
          <div className="row g-2 mb-3">
            <div className="col-12 col-md-3">
              <input className="form-control" value={maBacSi || ""} disabled title="Mã bác sĩ" />
            </div>
            <div className="col-6 col-md-3">
              <input
                type="date"
                className="form-control"
                value={ngay}
                onChange={(e) => { setNgay(e.target.value); setPage(1); }}
                title="Ngày hẹn"
              />
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e)=>{ setStatus(e.target.value); setPage(1); }}
                title="Trạng thái"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="-1">Hủy hẹn</option>
                <option value="1">Đã đặt lịch</option>
                <option value="2">Đang khám</option>
                <option value="3">Đã khám</option>
                <option value="5">Không đến</option>
              </select>
            </div>
            <div className="col-12 col-md-3 d-grid">
              <button className="btn btn-outline-secondary" onClick={clearFilters}>Xóa</button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 mb-2">{error}</div>}

          {/* ===== Bảng (cuộn) ===== */}
          <div className="table-zone">
            <div className="table-scroll">
              <table className="table table-hover align-middle mb-0 table-tight">
                <thead className="table-light">
                  <tr>
                    <th style={{width:130}}>Mã LH</th>
                    <th style={{minWidth:220}}>Bệnh nhân</th>
                    <th className="text-nowrap" style={{width:140}}>Ngày / Giờ</th>
                    <th style={{width:80}}>STT</th>
                    <th style={{minWidth:160}}>Chuyên khoa</th>
                    <th className="d-none d-lg-table-cell" style={{minWidth:160}}>Phòng</th>
                    <th className="d-none d-xl-table-cell" style={{minWidth:140}}>Ca</th>
                    <th style={{width:120}}>Hình thức</th>
                    <th style={{width:120}}>Trạng thái</th>
                    <th className="text-end" style={{width:150}}>Thao tác</th>
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
                      <td colSpan={10} className="text-center text-muted py-4">Không có lịch hẹn</td>
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
                              <li><button className="dropdown-item" onClick={() => changeStatus(r, 2)}>Đang khám</button></li>
                              <li><button className="dropdown-item" onClick={() => changeStatus(r, 3)}>Đã khám</button></li>
                              <li><button className="dropdown-item" onClick={() => changeStatus(r, 5)}>Không đến</button></li>
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

            {/* Pagination (ngoài vùng scroll) */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">Trang {page}/{totalPages} · Hiển thị {rows.length}</small>
              <div className="btn-group">
                <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => goto(1)}>&laquo;</button>
                <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => goto(page - 1)}>Trước</button>
                <button className="btn btn-outline-secondary" disabled>{page}</button>
                <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => goto(page + 1)}>Sau</button>
                <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => goto(totalPages)}>&raquo;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal chi tiết (center + scroll + backdrop) ===== */}
      {active && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Chi tiết lịch hẹn</h5>
                  <button type="button" className="btn-close" onClick={() => setActive(null)} />
                </div>
                <div className="modal-body">
                  {active.error ? (
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
                        <div className="mb-2"><strong>Bác sĩ:</strong> {active.tenBacSi || "-"}</div>
                        <div className="mb-2"><strong>Chuyên khoa:</strong> {active.tenChuyenKhoa || "-"}</div>
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
                <div className="modal-footer justify-content-center">
                  <button className="btn btn-secondary" onClick={() => setActive(null)}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setActive(null)} />
        </>
      )}
    </Layout>
  );
}
