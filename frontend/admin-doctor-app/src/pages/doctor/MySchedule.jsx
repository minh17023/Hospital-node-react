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
  const [maBacSi] = useState(() => String(me?.maBacSi || me?.mabacsi || ""));

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyUpcoming, setOnlyUpcoming] = useState(true);

  // pagination (FE-side, cố định 12/trang)
  const pageSize = 12;
  const [page, setPage] = useState(1);

  // create / edit
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { loadData(); }, [from, to, onlyUpcoming]); // tự lọc khi đổi

  // ===== Helpers thời gian =====
  const now = new Date();
  const nowISO = dateISO(now);

  function dateISO(d) {
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  function toDateTime(ngay, hhmmss) {
    const t = (hhmmss||"").slice(0,8) || "00:00:00";
    return new Date(`${ngay}T${t}`);
  }
  // ĐÚNG: “sắp tới” = ngày lớn hơn hôm nay, hoặc cùng ngày và giờ vào >= hiện tại
  function isUpcoming(r) {
    if (r.ngayLamViec > nowISO) return true;
    if (r.ngayLamViec < nowISO) return false;
    const dtStart = toDateTime(r.ngayLamViec, r.gioVao);
    return dtStart.getTime() >= now.getTime();
  }

  function clampDateRange(fStr, tStr) {
    const start = fStr ? new Date(fStr) : new Date();
    const end   = tStr ? new Date(tStr) : new Date(start.getTime() + 30*864e5);
    const maxSpanDays = 31;
    if ((end - start)/864e5 > maxSpanDays) end.setTime(start.getTime() + maxSpanDays*864e5);
    start.setHours(0,0,0,0); end.setHours(0,0,0,0);
    return { start, end };
  }

  async function loadData() {
    setLoading(true); setErr(""); setActionMsg("");
    try {
      if (!maBacSi) {
        setRows([]); setErr("Không tìm thấy mã bác sĩ trong ME."); setLoading(false);
        return;
      }
      const effFrom = onlyUpcoming ? today() : (from || today());
      const { start, end } = clampDateRange(effFrom, to || "");
      const tasks = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        const dayStr = dateISO(d);
        tasks.push(
          client.get(`/doctors/${maBacSi}/schedules`, { params: { ngayLamViec: dayStr } })
                .then(res => res?.data?.items || [])
                .catch(() => [])
        );
      }
      const byDay = await Promise.all(tasks);
      const flat  = byDay.flat();

      const sortedAsc = flat.sort((a,b) => {
        if (a.ngayLamViec !== b.ngayLamViec) return a.ngayLamViec.localeCompare(b.ngayLamViec);
        return String(a.gioVao).localeCompare(String(b.gioVao));
      });

      const filtered = onlyUpcoming ? sortedAsc.filter(isUpcoming) : sortedAsc;

      setRows(filtered);
      setPage(1);
    } catch (e) {
      setErr(e?.response?.data?.message || "Lỗi tải ca làm việc");
    } finally {
      setLoading(false);
    }
  }

  // ===== Create =====
  const openCreate = () => { setForm({ ...emptyForm, ngayLamViec: today() }); setCreating(true); };
  const closeCreate = () => { setCreating(false); };
  const onChange = (e, setter) => { const { name, value } = e.target; setter(prev => ({ ...prev, [name]: value })); };

  async function submitCreate(e) {
    e.preventDefault();
    if (!maBacSi) { alert("Không xác định được mã bác sĩ."); return; }
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
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || "Tạo ca thất bại");
    }
  }

  // ===== Edit =====
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

  // ===== Delete =====
  async function removeRow(row) {
    if (!window.confirm(`Xóa ca ${row.tenCaLamViec} ngày ${row.ngayLamViec}?`)) return;
    try {
      await client.delete(`/schedules/${row.maLichLamViec}`);
      setActionMsg("Đã xoá ca.");
      await loadData();
    } catch (e) {
      alert(e?.response?.data?.message || "Xoá thất bại (có thể ca đã có người đặt).");
    }
  }

  // FE pagination view
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const startIdx = (pageSafe - 1) * pageSize;
  const viewRows = rows.slice(startIdx, startIdx + pageSize);

  const clearFilters = () => { setFrom(""); setTo(""); setOnlyUpcoming(false); setPage(1); };

  return (
    <Layout>
      {/* ===== Styles full-height + bảng cuộn, thead sticky ===== */}
      <style>{`
        .page-flex{display:flex;flex-direction:column;height:calc(100vh - 90px);min-height:0}
        .table-zone{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
        .table-scroll{flex:1 1 auto;min-height:0;overflow:auto;border-radius:.25rem}
        .table-tight th,.table-tight td{padding-top:.55rem;padding-bottom:.55rem;vertical-align:middle}
        .table-scroll thead th{position:sticky;top:0;z-index:1;background:var(--bs-light)}
      `}</style>

      <div className="card page-flex">
        <div className="card-body d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="m-0">Lịch làm việc của tôi</h2>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="onlyUpcoming"
                checked={onlyUpcoming}
                onChange={(e)=>{ setOnlyUpcoming(e.target.checked); setPage(1); }}
              />
              <label className="form-check-label" htmlFor="onlyUpcoming">
                Chỉ hiển thị ca sắp tới
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="row g-2 mb-3">
            <div className="col-sm-3">
              <input
                type="date"
                className="form-control"
                value={onlyUpcoming ? today() : from}
                onChange={(e)=>{ setFrom(e.target.value); setPage(1); }}
                disabled={!!onlyUpcoming}
                title="Từ ngày"
              />
            </div>
            <div className="col-sm-3">
              <input
                type="date"
                className="form-control"
                value={to}
                onChange={(e)=>{ setTo(e.target.value); setPage(1); }}
                title="Đến ngày"
              />
            </div>
            <div className="col-sm-3 d-grid ms-auto">
              <button className="btn btn-outline-secondary" onClick={clearFilters}>Xóa lọc</button>
            </div>
            <div className="col-sm-3 d-grid">
              <button className="btn btn-primary" onClick={openCreate}>+ Tạo ca</button>
            </div>
          </div>

          {actionMsg && <div className="alert alert-success py-2">{actionMsg}</div>}
          {err && <div className="alert alert-danger py-2">{err}</div>}

          {/* ===== Bảng (cuộn) ===== */}
          <div className="table-zone">
            <div className="table-scroll">
              <table className="table table-hover align-middle mb-0 table-tight">
                <thead className="table-light">
                  <tr>
                    <th style={{width:120}}>Ngày</th>
                    <th style={{minWidth:180}}>Ca</th>
                    <th style={{width:130}}>Giờ</th>
                    <th style={{minWidth:200}}>Phòng</th>
                    <th style={{width:110}}>SL tối đa</th>
                    <th style={{width:130}}>SL đã đăng ký</th>
                    <th style={{width:110}}>Trạng thái</th>
                    <th className="text-end" style={{width:140}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border" role="status" /></td></tr>
                  ) : viewRows.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                  ) : viewRows.map(r => (
                    <tr key={r.maLichLamViec}>
                      <td className="text-nowrap">{r.ngayLamViec}</td>
                      <td className="text-nowrap">{r.tenCaLamViec}</td>
                      <td className="text-nowrap">{(r.gioVao||"").slice(0,5)}–{(r.gioRa||"").slice(0,5)}</td>
                      <td className="text-nowrap">{r.tenPhongKham} <span className="text-muted">#{r.maPhongKham}</span></td>
                      <td>{r.soLuongBenhNhanToiDa}</td>
                      <td>{r.soLuongDaDangKy}</td>
                      <td>
                        <span className={`badge ${Number(r.trangThaiLamViec)===1?"bg-success":"bg-secondary"}`}>
                          {Number(r.trangThaiLamViec)===1 ? "Mở" : "Đóng"}
                        </span>
                      </td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>openEdit(r)}>Sửa</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>removeRow(r)}>Xoá</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination (ngoài vùng scroll) */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">Trang {pageSafe}/{totalPages} · Hiển thị {viewRows.length} / {total}</small>
              <div className="btn-group">
                <button className="btn btn-outline-secondary" disabled={pageSafe <= 1} onClick={()=>setPage(1)}>&laquo;</button>
                <button className="btn btn-outline-secondary" disabled={pageSafe <= 1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Trước</button>
                <button className="btn btn-outline-secondary" disabled>{pageSafe}</button>
                <button className="btn btn-outline-secondary" disabled={pageSafe >= totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Sau</button>
                <button className="btn btn-outline-secondary" disabled={pageSafe >= totalPages} onClick={()=>setPage(totalPages)}>&raquo;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal tạo ca (center + scroll + backdrop) ===== */}
      {creating && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
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
                        <label className="form-label small">Mã phòng khám *</label>
                        <input className="form-control" name="maPhongKham" value={form.maPhongKham}
                               onChange={(e)=>onChange(e,setForm)} placeholder="VD: PK00000001" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Mã ca làm việc *</label>
                        <input className="form-control" name="maCaLamViec" value={form.maCaLamViec}
                               onChange={(e)=>onChange(e,setForm)} placeholder="VD: CL00000001" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Ngày làm việc *</label>
                        <input type="date" className="form-control" name="ngayLamViec" value={form.ngayLamViec}
                               onChange={(e)=>onChange(e,setForm)} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Số BN tối đa</label>
                        <input type="number" min="1" className="form-control" name="soLuongBenhNhanToiDa"
                               value={form.soLuongBenhNhanToiDa} onChange={(e)=>onChange(e,setForm)} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Trạng thái</label>
                        <select className="form-select" name="trangThaiLamViec"
                                value={form.trangThaiLamViec} onChange={(e)=>onChange(e,setForm)}>
                          <option value={1}>Mở</option>
                          <option value={0}>Đóng</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer justify-content-center">
                    <button type="button" className="btn btn-outline-secondary" onClick={closeCreate}>Hủy</button>
                    <button className="btn btn-primary" type="submit" disabled={!maBacSi}>Tạo</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeCreate} />
        </>
      )}

      {/* ===== Modal sửa ca (center + scroll + backdrop) ===== */}
      {editing && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <form onSubmit={submitEdit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Sửa ca #{editing.maLichLamViec}</h5>
                    <button type="button" className="btn-close" onClick={closeEdit}></button>
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small">Mã phòng khám</label>
                        <input className="form-control" name="maPhongKham" value={editForm.maPhongKham}
                               onChange={(e)=>onChange(e,setEditForm)} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Mã ca làm việc</label>
                        <input className="form-control" name="maCaLamViec" value={editForm.maCaLamViec}
                               onChange={(e)=>onChange(e,setEditForm)} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Ngày làm việc</label>
                        <input type="date" className="form-control" name="ngayLamViec" value={editForm.ngayLamViec}
                               onChange={(e)=>onChange(e,setEditForm)} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Số BN tối đa</label>
                        <input type="number" min="1" className="form-control" name="soLuongBenhNhanToiDa"
                               value={editForm.soLuongBenhNhanToiDa} onChange={(e)=>onChange(e,setEditForm)} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Trạng thái</label>
                        <select className="form-select" name="trangThaiLamViec"
                                value={editForm.trangThaiLamViec} onChange={(e)=>onChange(e,setEditForm)}>
                          <option value={1}>Mở</option>
                          <option value={0}>Đóng</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label small">Ghi chú</label>
                        <textarea className="form-control" rows={2}
                                  name="ghiChu" value={editForm.ghiChu || ""} onChange={(e)=>onChange(e,setEditForm)} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer justify-content-center">
                    <button type="button" className="btn btn-outline-secondary" onClick={closeEdit}>Hủy</button>
                    <button className="btn btn-primary" type="submit">Lưu</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeEdit} />
        </>
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
