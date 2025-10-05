import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

function getMe() {
  try { return JSON.parse(localStorage.getItem("ME") || "null"); }
  catch { return null; }
}

const emptyForm = {
  maPhongKham: "",
  maCaLamViec: "",
  ngayLamViec: "",
  soLuongBenhNhanToiDa: 20,
  trangThaiLamViec: 1,
};

export default function MySchedule() {
  const me = useMemo(() => getMe() || {}, []);
  const [maBacSi, setMaBacSi] = useState("");
  const [rows, setRows] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filter
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // chỉ hiển thị ca SẮP TỚI (>= hiện tại)
  const [onlyUpcoming, setOnlyUpcoming] = useState(true);

  // pagination (SERVER-SIDE)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // create / edit
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [actionMsg, setActionMsg] = useState("");

  // load once -> lấy mã bác sĩ cho tài khoản (để tạo/sửa)
  useEffect(() => {
    (async () => {
      await loadDoctorCode();
    })();
  }, []);

  // load danh sách khi đổi filter/pagination
  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [page, pageSize, from, to, onlyUpcoming]);

  async function loadDoctorCode() {
    try {
      // Tìm bác sĩ theo maUser hiện tại
      const rs = await client.get("/doctors", { params: { limit: 500, offset: 0 } });
      const mine = (rs?.data?.items || []).find(x => String(x.maUser) === String(me?.maUser));
      if (mine) setMaBacSi(String(mine.maBacSi));
    } catch {}
  }

  async function loadData() {
    setLoading(true); setErr(""); setActionMsg("");
    try {
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      // Nếu tick "Chỉ hiển thị ca sắp tới" -> mặc định from = today
      const todayStr = today();
      const effFrom = onlyUpcoming ? todayStr : (from || "");
      if (effFrom) params.from = effFrom;
      if (to) params.to = to;

      // API mới: chỉ lấy ca của chính Doctor
      const { data } = await client.get("/schedules/my", { params });

      // BE đang ORDER BY ngày DESC; ta chuẩn hoá lại theo tăng dần (ngày, giờ vào)
      const raw = data?.items || [];
      const sortedAsc = [...raw].sort((a,b) => {
        if (a.ngayLamViec !== b.ngayLamViec) return a.ngayLamViec.localeCompare(b.ngayLamViec);
        return String(a.gioVao).localeCompare(String(b.gioVao));
      });

      // Nếu today: loại các ca đã bắt đầu (gioVao < now)
      const filtered = onlyUpcoming ? sortedAsc.filter(isNotPastToday) : sortedAsc;

      setRows(filtered);
      setServerTotal(Number(data?.total || 0));  // tổng theo BE (chưa trừ “đã qua giờ” của hôm nay)
    } catch (e) {
      setErr(e?.response?.data?.message || "Lỗi tải ca làm việc");
    } finally {
      setLoading(false);
    }
  }

  // ===== Helpers thời gian =====
  const now = new Date();
  const nowISO = dateISO(now);

  function dateISO(d) {
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  function toDateTime(ngay, hhmmss) {
    const t = (hhmmss||"").slice(0,8); // "HH:MM:SS"
    return new Date(`${ngay}T${t || "00:00:00"}`);
  }
  function isNotPastToday(r) {
    if (r.ngayLamViec > nowISO) return true;
    if (r.ngayLamViec < nowISO) return true; // từ today đã filter ở BE bằng from; đây chỉ chạy khi from=today
    // cùng ngày -> còn ca nếu giờ vào >= hiện tại
    const dtStart = toDateTime(r.ngayLamViec, r.gioVao);
    return dtStart.getTime() >= now.getTime();
  }

  // ở đây rows đã là page từ BE (limit/offset). Không phân trang lại FE.
  const shownCount = rows.length;

  // ====== Create ======
  const openCreate = () => { setForm({ ...emptyForm, ngayLamViec: today() }); setCreating(true); };
  const closeCreate = () => { setCreating(false); };
  const onChange = (e, setter) => { const { name, value } = e.target; setter(prev => ({ ...prev, [name]: value })); };

  async function submitCreate(e) {
    e.preventDefault();
    if (!maBacSi) { alert("Không xác định được mã bác sĩ cho tài khoản này."); return; }
    try {
      const payload = {
        maBacSi,
        maPhongKham: String(form.maPhongKham).trim(),
        maCaLamViec: String(form.maCaLamViec).trim(),
        ngayLamViec: form.ngayLamViec,
        soLuongBenhNhanToiDa: Number(form.soLuongBenhNhanToiDa || 20),
        trangThaiLamViec: Number(form.trangThaiLamViec || 1)
      };
      await client.post("/schedules", payload);
      setActionMsg("Đã tạo ca làm việc.");
      setCreating(false);
      // quay lại trang 1 để thấy ca mới
      setPage(1);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || "Tạo ca thất bại");
    }
  }

  // ====== Edit ======
  const openEdit = (row) => {
    setEditing(row);
    setEditForm({
      maPhongKham: row.maPhongKham,
      maCaLamViec: row.maCaLamViec,
      ngayLamViec: row.ngayLamViec,
      soLuongBenhNhanToiDa: row.soLuongBenhNhanToiDa,
      trangThaiLamViec: row.trangThaiLamViec,
      ghiChu: row.ghiChu || ""
    });
  };
  const closeEdit = () => { setEditing(null); };

  async function submitEdit(e) {
    e.preventDefault();
    try {
      const payload = {};
      ["maPhongKham","maCaLamViec","ngayLamViec","soLuongBenhNhanToiDa","trangThaiLamViec","ghiChu"]
        .forEach(k => { if (editing[k] !== editForm[k]) payload[k] = editForm[k]; });
      if (Object.keys(payload).length === 0) { closeEdit(); return; }
      await client.put(`/schedules/${editing.maLichLamViec}`, payload);
      setActionMsg("Đã cập nhật ca.");
      setEditing(null);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || "Cập nhật thất bại");
    }
  }

  // ====== Delete ======
  async function removeRow(row) {
    if (!window.confirm(`Xóa ca ${row.tenCaLamViec} ngày ${row.ngayLamViec}?`)) return;
    try {
      await client.delete(`/schedules/${row.maLichLamViec}`);
      setActionMsg("Đã xoá ca.");
      // nếu xoá hết của trang hiện tại thì tự lùi 1 trang
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || "Xoá thất bại (có thể ca đã có người đặt).");
    }
  }

  return (
    <Layout>
      <div className="container-fluid px-0">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="mb-0">Ca làm việc của tôi</h3>
          <div className="d-flex gap-2">
            <div className="form-check form-switch me-2">
              <input className="form-check-input" type="checkbox"
                     id="onlyUpcoming" checked={onlyUpcoming}
                     onChange={(e)=>{ setOnlyUpcoming(e.target.checked); setPage(1); }} />
              <label className="form-check-label" htmlFor="onlyUpcoming">
                Chỉ hiển thị ca sắp tới
              </label>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>+ Tạo ca</button>
          </div>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-sm-3">
                <label className="form-label small">Từ ngày</label>
                <input
                  type="date"
                  className="form-control"
                  value={onlyUpcoming ? today() : from}
                  onChange={(e)=>{ setFrom(e.target.value); setPage(1); }}
                  disabled={!!onlyUpcoming}
                />
              </div>
              <div className="col-sm-3">
                <label className="form-label small">Đến ngày</label>
                <input type="date" className="form-control" value={to}
                       onChange={(e)=>{ setTo(e.target.value); setPage(1); }} />
              </div>
              <div className="col-sm-3">
                <label className="form-label small">Số dòng / trang</label>
                <select className="form-select" value={pageSize}
                        onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="col-sm-3 d-flex align-items-end gap-2">
                <button className="btn btn-primary" onClick={()=>{ setPage(1); loadData(); }}>Lọc</button>
                <button className="btn btn-outline-secondary" onClick={()=>{
                  setFrom(""); setTo(""); setOnlyUpcoming(false); setPage(1); loadData();
                }}>Xóa lọc</button>
              </div>
            </div>
          </div>
        </div>

        {actionMsg && <div className="alert alert-success py-2">{actionMsg}</div>}
        {err && <div className="alert alert-danger">{err}</div>}

        <div className="card shadow-sm">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Ngày</th>
                    <th>Ca</th>
                    <th>Giờ</th>
                    <th>Phòng</th>
                    <th>SL tối đa</th>
                    <th>SL đã đăng ký</th>
                    <th>Trạng thái</th>
                    <th width="1%"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8}>Đang tải…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8}>Không có dữ liệu</td></tr>
                  ) : rows.map(r => (
                    <tr key={r.maLichLamViec}>
                      <td>{r.ngayLamViec}</td>
                      <td>{r.tenCaLamViec}</td>
                      <td>{(r.gioVao||"").slice(0,5)}–{(r.gioRa||"").slice(0,5)}</td>
                      <td>{r.tenPhongKham} <span className="text-muted">#{r.maPhongKham}</span></td>
                      <td>{r.soLuongBenhNhanToiDa}</td>
                      <td>{r.soLuongDaDangKy}</td>
                      <td>
                        <span className={`badge ${Number(r.trangThaiLamViec)===1?"bg-success":"bg-secondary"}`}>
                          {Number(r.trangThaiLamViec)===1 ? "Mở" : "Đóng"}
                        </span>
                      </td>
                      <td className="text-nowrap">
                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={()=>openEdit(r)}>Sửa</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>removeRow(r)}>Xoá</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls (server-side) */}
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">
                Trang {page} — hiển thị {shownCount} dòng • Tổng (BE): {serverTotal}
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page<=1?"disabled":""}`}>
                    <button className="page-link" onClick={()=>setPage(1)}>&laquo;</button>
                  </li>
                  <li className={`page-item ${page<=1?"disabled":""}`}>
                    <button className="page-link" onClick={()=>setPage(p=>Math.max(1,p-1))}>Trước</button>
                  </li>
                  <li className="page-item disabled">
                    <span className="page-link">
                      {page}/{Math.max(1, Math.ceil(serverTotal / pageSize))}
                    </span>
                  </li>
                  <li className={`page-item ${page >= Math.max(1, Math.ceil(serverTotal / pageSize)) ? "disabled":""}`}>
                    <button className="page-link" onClick={()=>setPage(p=>p+1)}>Sau</button>
                  </li>
                  <li className={`page-item ${page >= Math.max(1, Math.ceil(serverTotal / pageSize)) ? "disabled":""}`}>
                    <button className="page-link" onClick={()=>setPage(Math.max(1, Math.ceil(serverTotal / pageSize)))}>&raquo;</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal tạo ca ===== */}
      {creating && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{background:"rgba(0,0,0,.3)"}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={submitCreate}>
                <div className="modal-header">
                  <h5 className="modal-title">Tạo ca làm việc</h5>
                  <button type="button" className="btn-close" onClick={closeCreate}></button>
                </div>
                <div className="modal-body">
                  {!maBacSi && <div className="alert alert-warning">Không xác định được mã bác sĩ – chưa thể tạo ca.</div>}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Mã phòng khám *</label>
                      <input className="form-control" name="maPhongKham" value={form.maPhongKham}
                             onChange={(e)=>onChange(e,setForm)} placeholder="VD: 101" required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Mã ca làm việc *</label>
                      <input className="form-control" name="maCaLamViec" value={form.maCaLamViec}
                             onChange={(e)=>onChange(e,setForm)} placeholder="VD: 1" required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Ngày làm việc *</label>
                      <input type="date" className="form-control" name="ngayLamViec" value={form.ngayLamViec}
                             onChange={(e)=>onChange(e,setForm)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Số BN tối đa</label>
                      <input type="number" min="1" className="form-control" name="soLuongBenhNhanToiDa"
                             value={form.soLuongBenhNhanToiDa} onChange={(e)=>onChange(e,setForm)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Trạng thái</label>
                      <select className="form-select" name="trangThaiLamViec"
                              value={form.trangThaiLamViec} onChange={(e)=>onChange(e,setForm)}>
                        <option value={1}>Mở</option>
                        <option value={0}>Đóng</option>
                      </select>
                    </div>
                  </div>

                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeCreate}>Hủy</button>
                  <button className="btn btn-primary" type="submit" disabled={!maBacSi}>Tạo</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal sửa ca ===== */}
      {editing && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{background:"rgba(0,0,0,.3)"}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={submitEdit}>
                <div className="modal-header">
                  <h5 className="modal-title">Sửa ca #{editing.maLichLamViec}</h5>
                  <button type="button" className="btn-close" onClick={closeEdit}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Mã phòng khám</label>
                      <input className="form-control" name="maPhongKham" value={editForm.maPhongKham}
                             onChange={(e)=>onChange(e,setEditForm)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Mã ca làm việc</label>
                      <input className="form-control" name="maCaLamViec" value={editForm.maCaLamViec}
                             onChange={(e)=>onChange(e,setEditForm)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Ngày làm việc</label>
                      <input type="date" className="form-control" name="ngayLamViec" value={editForm.ngayLamViec}
                             onChange={(e)=>onChange(e,setEditForm)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Số BN tối đa</label>
                      <input type="number" min="1" className="form-control" name="soLuongBenhNhanToiDa"
                             value={editForm.soLuongBenhNhanToiDa} onChange={(e)=>onChange(e,setEditForm)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Trạng thái</label>
                      <select className="form-select" name="trangThaiLamViec"
                              value={editForm.trangThaiLamViec} onChange={(e)=>onChange(e,setEditForm)}>
                        <option value={1}>Mở</option>
                        <option value={0}>Đóng</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Ghi chú</label>
                      <textarea className="form-control" rows={2}
                                name="ghiChu" value={editForm.ghiChu || ""} onChange={(e)=>onChange(e,setEditForm)} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeEdit}>Hủy</button>
                  <button className="btn btn-primary" type="submit">Lưu</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function today() {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
