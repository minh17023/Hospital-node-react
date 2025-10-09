import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

/* ============== Helpers ============== */
const DEFAULT_LIMIT = 8;
const num = (v) => (v == null || v === "" ? "" : Number(v));
const truncate = (s, n = 60) => (s && s.length > n ? s.slice(0, n) + "…" : s);

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

/* ============== Page ============== */
export default function AdminClinics() {
  // filters
  const [q, setQ] = useState("");
  const [maChuyenKhoa, setMaChuyenKhoa] = useState("");
  const [trangThai, setTrangThai] = useState(""); // "", "1", "0"

  // data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // specialties to choose
  const [specialties, setSpecialties] = useState([]);

  // pagination
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editData, setEditData] = useState(null); // clinic object or null
  const [confirmDel, setConfirmDel] = useState(null); // { maPhongKham, tenPhongKham }

  // alerts
  const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
  const flash = (message, type = "success", timeout = 2200) => {
    setAlert({ show: true, type, message });
    if (timeout) setTimeout(() => setAlert((s) => ({ ...s, show: false })), timeout);
  };

  /* ============== Loaders ============== */
  async function loadSpecialtiesOnce() {
    try {
      const { data } = await client.get("/specialties");
      setSpecialties(data?.items || []);
    } catch {
      setSpecialties([]);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {
        q: q.trim() || undefined,
        maChuyenKhoa: maChuyenKhoa || undefined,
        trangThai: trangThai !== "" ? Number(trangThai) : undefined,
        page,
        limit,
      };
      const { data } = await client.get("/clinics", { params });
      setItems(data?.items || []);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      const msg = e?.response?.data?.message || "Không tải được danh sách phòng khám";
      setError(msg);
      flash(msg, "danger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSpecialtiesOnce(); }, []);
  useEffect(() => { load(); }, [page, limit]); // page changes via offset/limit

  const onFilterSubmit = async (e) => {
    e.preventDefault();
    setOffset(0);
    await load();
  };

  const clearFilters = () => {
    setQ(""); setMaChuyenKhoa(""); setTrangThai("");
    setOffset(0);
    load().then(() => flash("Đã xoá bộ lọc", "info"));
  };

  const next = () => setOffset((o) => Math.min(o + limit, Math.max(0, (totalPages - 1) * limit)));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  /* ============== CRUD handlers ============== */
  async function handleCreate(payload) {
    try {
      await client.post("/clinics", payload);
      setCreateOpen(false);
      await load();
      flash("Đã tạo phòng khám");
    } catch (e) {
      flash(e?.response?.data?.message || "Không tạo được phòng khám", "danger");
    }
  }

  async function handleUpdate(maPhongKham, patch) {
    try {
      await client.put(`/clinics/${encodeURIComponent(maPhongKham)}`, patch);
      setEditData(null);
      await load();
      flash("Đã cập nhật phòng khám");
    } catch (e) {
      flash(e?.response?.data?.message || "Cập nhật thất bại", "danger");
    }
  }

  async function handleDelete() {
    if (!confirmDel) return;
    try {
      await client.delete(`/clinics/${encodeURIComponent(confirmDel.maPhongKham)}`);
      setConfirmDel(null);
      if (items.length === 1 && page > 1) setOffset((p) => p - limit);
      await load();
      flash("Đã xoá phòng khám");
    } catch (e) {
      flash(e?.response?.data?.message || "Xoá thất bại", "danger");
    }
  }

  return (
    <Layout>
      <div className="card">
        <div className="card-body">
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý phòng khám</h2>
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ Thêm phòng khám</button>
          </div>

          {/* Alert */}
          <AlertBanner
            show={alert.show}
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert((s) => ({ ...s, show: false }))}
          />

          {/* Filters */}
          <form className="row g-2 mb-3" onSubmit={onFilterSubmit}>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Tìm theo tên phòng khám…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={maChuyenKhoa}
                onChange={(e) => setMaChuyenKhoa(e.target.value)}
              >
                <option value="">Tất cả chuyên khoa</option>
                {specialties.map((s) => (
                  <option key={s.maChuyenKhoa} value={s.maChuyenKhoa}>
                    {s.tenChuyenKhoa} ({s.maChuyenKhoa})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={trangThai}
                onChange={(e) => setTrangThai(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Ngưng</option>
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}
              >
                {[12, 20, 30, 50].map((n) => <option key={n} value={n}>{n} / trang</option>)}
              </select>
            </div>
            <div className="col-md-1 d-grid">
              <button className="btn btn-outline-secondary" type="submit">Tải</button>
            </div>
            <div className="col-md-1 d-grid">
              <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>Xoá</button>
            </div>
          </form>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 130 }}>Mã phòng</th>
                  <th>Tên phòng khám</th>
                  <th style={{ width: 160 }}>Chuyên khoa</th>
                  <th style={{ width: 90 }}>Tầng</th>
                  <th style={{ width: 110 }}>Diện tích (m²)</th>
                  <th style={{ width: 110 }}>Sức chứa</th>
                  <th style={{ width: 220 }}>Trang bị</th>
                  <th style={{ width: 110 }}>Trạng thái</th>
                  <th style={{ width: 150 }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center">
                      <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.maPhongKham}>
                      <td><span className="badge bg-secondary">{r.maPhongKham}</span></td>
                      <td className="text-nowrap">{r.tenPhongKham}</td>
                      <td className="text-nowrap">{r.maChuyenKhoa || "-"}</td>
                      <td>{r.tang ?? "-"}</td>
                      <td className="text-nowrap">{r.dienTich != null ? r.dienTich : "-"}</td>
                      <td>{r.sucChua != null ? r.sucChua : "-"}</td>
                      <td title={r.trangBi || ""}>{truncate(r.trangBi || "-")}</td>
                      <td className="text-center">
                        {Number(r.trangThai) === 1
                          ? <span className="badge bg-success">Hoạt động</span>
                          : <span className="badge bg-secondary">Ngưng</span>}
                      </td>
                      <td className="text-end text-nowrap">
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditData(r)}>Sửa</button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setConfirmDel({ maPhongKham: r.maPhongKham, tenPhongKham: r.tenPhongKham })}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">
              Tổng: {total} • Trang {page}/{totalPages}
            </small>
            <div>
              <button className="btn btn-outline-secondary me-2" disabled={page <= 1} onClick={prev}>← Trước</button>
              <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={next}>Sau →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <ClinicModal
          title="Thêm phòng khám"
          specialties={specialties}
          onClose={() => setCreateOpen(false)}
          onSubmit={(p) => handleCreate(p)}
        />
      )}

      {/* Edit Modal */}
      {editData && (
        <ClinicModal
          title={`Sửa phòng khám ${editData.tenPhongKham}`}
          specialties={specialties}
          data={editData}
          editMode
          onClose={() => setEditData(null)}
          onSubmit={(p) => handleUpdate(editData.maPhongKham, p)}
        />
      )}

      {/* Confirm Delete */}
      {confirmDel && (
        <ConfirmModal
          text={`Xóa phòng khám "${confirmDel.tenPhongKham}" (${confirmDel.maPhongKham})?`}
          onClose={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}

/* ============== Modals ============== */
function ClinicModal({ title, specialties = [], data = {}, editMode = false, onClose, onSubmit }) {
  const [tenPhongKham, setTenPhongKham] = useState(data.tenPhongKham || "");
  const [maChuyenKhoa, setMaChuyenKhoa] = useState(data.maChuyenKhoa || "");
  const [tang, setTang] = useState(num(data.tang));
  const [dienTich, setDienTich] = useState(num(data.dienTich));
  const [sucChua, setSucChua] = useState(num(data.sucChua));
  const [trangBi, setTrangBi] = useState(data.trangBi || "");
  const [ghiChu, setGhiChu] = useState(data.ghiChu || "");
  const [trangThai, setTrangThai] = useState(data.trangThai ?? 1);

  const submit = (e) => {
    e.preventDefault();
    if (!tenPhongKham.trim()) return alert("Vui lòng nhập tên phòng khám");
    const payload = {
      tenPhongKham: tenPhongKham.trim(),
      maChuyenKhoa: maChuyenKhoa || null,
      tang: tang === "" ? null : Number(tang),
      dienTich: dienTich === "" ? null : Number(dienTich),
      sucChua: sucChua === "" ? null : Number(sucChua),
      trangBi: trangBi || null,
      ghiChu: ghiChu || null,
      trangThai: Number(trangThai),
    };
    // Nếu chế độ sửa: chỉ gửi trường thay đổi là tuỳ; backend của bạn chấp nhận patch tự do
    onSubmit(payload);
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Tên phòng khám <span className="text-danger">*</span></label>
                  <input className="form-control" value={tenPhongKham} onChange={(e) => setTenPhongKham(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Chuyên khoa</label>
                  <select className="form-select" value={maChuyenKhoa} onChange={(e) => setMaChuyenKhoa(e.target.value)}>
                    <option value="">— Không —</option>
                    {specialties.map((s) => (
                      <option key={s.maChuyenKhoa} value={s.maChuyenKhoa}>
                        {s.tenChuyenKhoa} ({s.maChuyenKhoa})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label">Tầng</label>
                  <input type="number" className="form-control" value={tang} onChange={(e) => setTang(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Diện tích (m²)</label>
                  <input type="number" className="form-control" value={dienTich} onChange={(e) => setDienTich(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Sức chứa</label>
                  <input type="number" className="form-control" value={sucChua} onChange={(e) => setSucChua(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
                    <option value={1}>Hoạt động</option>
                    <option value={0}>Ngưng</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Trang bị</label>
                  <textarea className="form-control" rows={2} value={trangBi} onChange={(e) => setTrangBi(e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label">Ghi chú</label>
                  <textarea className="form-control" rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer justify-content-center">
              <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" type="submit">{editMode ? "Lưu thay đổi" : "Tạo phòng khám"}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function ConfirmModal({ text, onClose, onConfirm }) {
  return (
    <>
      <div className="modal fade show" style={{ display: "block" }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Xác nhận</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="m-0">{text}</p>
            </div>
            <div className="modal-footer justify-content-center">
              <button className="btn btn-outline-secondary" onClick={onClose}>Hủy</button>
              <button className="btn btn-danger" onClick={onConfirm}>Xóa</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
