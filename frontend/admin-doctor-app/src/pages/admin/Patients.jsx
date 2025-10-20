import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

const DEFAULT_PAGE_SIZE = 10;

/* --- Alert nhỏ dùng chung --- */
function AlertBanner({ visible, type = "success", message, onClose }) {
  if (!visible) return null;
  return (
    <div className={`alert alert-${type} alert-dismissible fade show`} role="alert">
      {message}
      <button type="button" className="btn-close" onClick={onClose}></button>
    </div>
  );
}

export default function AdminPatients() {
  /* ===== Filters ===== */
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* ===== Data ===== */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ===== Pagination ===== */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* ===== View modal ===== */
  const [viewing, setViewing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ===== Edit modal ===== */
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  /* ===== Delete state ===== */
  const [deleting, setDeleting] = useState(false);

  /* ===== Alert ===== */
  const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
  const flash = (message, type = "success", timeout = 2200) => {
    setAlert({ show: true, type, message });
    if (timeout) setTimeout(() => setAlert((s) => ({ ...s, show: false })), timeout);
  };

  // debounce nhập từ khóa
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // guard đua request
  const runId = useRef(0);

  async function loadData() {
    const id = ++runId.current;
    setLoading(true);
    try {
      const params = {
        q: qDebounced || undefined,
        trangThai: trangThai !== "" ? Number(trangThai) : undefined,
        from: from || undefined,
        to: to || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy: "ngayTao",
        order: "DESC",
      };
      const { data } = await client.get("/patients", { params });
      if (id !== runId.current) return; // bỏ response cũ
      setRows(data?.items || []);
      setTotal(Number(data?.total || 0));
    } catch (e2) {
      const msg = e2?.response?.data?.message || "Không tải được danh sách bệnh nhân";
      if (id !== runId.current) return;
      flash(msg, "danger");
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }

  // Tự load khi filter/paging thay đổi (không còn nút Lọc)
  useEffect(() => {
    loadData();
    return () => { runId.current++; };
  }, [qDebounced, trangThai, from, to, page, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const pageSafe = Math.min(page, totalPages);

  /* ===== View ===== */
  async function openView(ma) {
    setViewing(ma); setDetail(null); setDetailLoading(true);
    try {
      const { data } = await client.get(`/patients/${ma}`);
      setDetail(data?.patient || null);
    } catch {
      setDetail(null);
    } finally { setDetailLoading(false); }
  }
  const closeView = () => { setViewing(null); setDetail(null); };

  /* ===== Edit ===== */
  async function openEdit(ma) {
    try {
      const { data } = await client.get(`/patients/${ma}`);
      const p = data?.patient || {};
      setEditing(p);
      setEditForm({
        hoTen: p.hoTen || "",
        ngaySinh: p.ngaySinh || "",
        gioiTinh: (p.gioiTinh === "F" || p.gioiTinh === 2 || p.gioiTinh === "2") ? "F" : "M",
        soCCCD: p.soCCCD || "",
        soDienThoai: p.soDienThoai || "",
        email: p.email || "",
        diaChi: p.diaChi || "",
        ngheNghiep: p.ngheNghiep || "",
        tinhTrangHonNhan: p.tinhTrangHonNhan || "",
        nguoiLienHe: p.nguoiLienHe || "",
        sdtLienHe: p.sdtLienHe || "",
        trangThai: Number(p.trangThai ?? 1),
      });
    } catch (e) {
      flash(e?.response?.data?.message || "Không tải được hồ sơ", "danger");
    }
  }
  const closeEdit = () => { setEditing(null); setEditForm({}); };
  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  async function submitEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {};
      Object.keys(editForm).forEach((k) => {
        const newVal = k === "gioiTinh" ? (editForm[k] === "F" ? "F" : "M") : editForm[k];
        if (String(newVal) !== String(editing[k] ?? "")) payload[k] = newVal;
      });
      if (Object.keys(payload).length === 0) { closeEdit(); return; }
      await client.put(`/patients/${editing.maBenhNhan}`, payload);
      closeEdit();
      await loadData();
      flash("Đã cập nhật hồ sơ bệnh nhân");
    } catch (er) {
      flash(er?.response?.data?.message || "Cập nhật thất bại", "danger");
    } finally { setSaving(false); }
  }

  /* ===== Delete ===== */
  async function removeRow(ma, hoTen) {
    if (!window.confirm(`Xoá hồ sơ bệnh nhân "${hoTen}" (${ma})?`)) return;
    setDeleting(true);
    try {
      await client.delete(`/patients/${ma}`);
      if ((rows.length === 1) && page > 1) setPage((p) => p - 1);
      await loadData();
      flash("Đã xoá hồ sơ bệnh nhân");
    } catch (e) {
      flash(e?.response?.data?.message || "Xoá thất bại", "danger");
    } finally { setDeleting(false); }
  }

  const clearFilters = () => {
    setQ(""); setTrangThai(""); setFrom(""); setTo("");
    setPage(1);
  };

  return (
    <Layout>
      {/* CSS nội tuyến để table cuộn, không tràn trang */}
      <style>{`
        .page-flex {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 90px);
          min-height: 0;
        }
        .table-zone {
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .table-scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          border-radius: .25rem;
        }
        .table-scroll table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--bs-light);
        }
      `}</style>

      <div className="card page-flex">
        <div className="card-body d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý bệnh nhân</h2>
          </div>

          {/* Alerts */}
          <AlertBanner
            visible={alert.show}
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert((s) => ({ ...s, show: false }))}
          />

          {/* Filters – KHÔNG có nút Lọc, tự load khi đổi */}
          <div className="row g-2 mb-3">
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder="Tìm theo tên/CCCD/SĐT/email/mã…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={trangThai}
                onChange={(e) => { setTrangThai(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Ngưng</option>
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                max={to || undefined}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                min={from || undefined}
              />
            </div>
            <div className="col-md-1 d-grid">
              <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
                Xóa
              </button>
            </div>
          </div>

          {/* Bảng + scroll riêng */}
          <div className="table-zone">
            <div className="table-scroll">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 140 }}>Mã</th>
                    <th>Họ tên</th>
                    <th style={{ width: 120 }}>Ngày sinh</th>
                    <th style={{ width: 90 }}>Giới tính</th>
                    <th style={{ width: 140 }}>CCCD</th>
                    <th style={{ width: 130 }}>SĐT</th>
                    <th style={{ width: 200 }}>Email</th>
                    <th style={{ width: 160 }}>Ngày tạo</th>
                    <th style={{ width: 110 }}>Trạng thái</th>
                    <th style={{ width: 170 }} className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-4 text-center">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading…</span>
                        </div>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={10} className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.maBenhNhan}>
                        <td><span className="badge bg-secondary">{r.maBenhNhan}</span></td>
                        <td>{r.hoTen}</td>
                        <td className="text-nowrap">{r.ngaySinh || "-"}</td>
                        <td>{(r.gioiTinh === "F" || r.gioiTinh === 2 || r.gioiTinh === "2") ? "Nữ" : "Nam"}</td>
                        <td className="text-nowrap">{r.soCCCD || "-"}</td>
                        <td className="text-nowrap">{r.soDienThoai || "-"}</td>
                        <td className="text-nowrap">{r.email || "-"}</td>
                        <td className="text-nowrap">{toDateTime(r.ngayTao)}</td>
                        <td className="text-center">
                          {Number(r.trangThai) === 1
                            ? <span className="badge bg-success">Hoạt động</span>
                            : <span className="badge bg-secondary">Ngưng</span>}
                        </td>
                        <td className="text-end text-nowrap">
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openView(r.maBenhNhan)}>Xem</button>
                          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openEdit(r.maBenhNhan)}>Sửa</button>
                          <button className="btn btn-sm btn-outline-danger" disabled={deleting} onClick={() => removeRow(r.maBenhNhan, r.hoTen)}>Xóa</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination – nằm ngoài vùng scroll */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="d-flex align-items-center gap-3">
                <small className="text-muted">
                  Hiển thị {total === 0 ? 0 : (pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, total)} / {total}
                </small>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 90 }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={8}>8/trang</option>
                  <option value={16}>16/trang</option>
                  <option value={24}>24/trang</option>
                </select>
              </div>
              <div>
                <button className="btn btn-outline-secondary me-2" disabled={pageSafe <= 1} onClick={() => setPage(1)}>&laquo;</button>
                <button className="btn btn-outline-secondary me-2" disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
                <span className="mx-1">{pageSafe}/{totalPages}</span>
                <button className="btn btn-outline-secondary ms-2" disabled={pageSafe >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Sau</button>
                <button className="btn btn-outline-secondary ms-2" disabled={pageSafe >= totalPages} onClick={() => setPage(totalPages)}>&raquo;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modals ===== */}
      {viewing && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Hồ sơ bệnh nhân #{viewing}</h5>
                  <button type="button" className="btn-close" onClick={closeView}></button>
                </div>
                <div className="modal-body">
                  {detailLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                    </div>
                  ) : !detail ? (
                    <div className="text-danger">Không tải được dữ liệu.</div>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-6"><strong>Họ tên:</strong> {detail.hoTen}</div>
                      <div className="col-md-3"><strong>Ngày sinh:</strong> {detail.ngaySinh || "-"}</div>
                      <div className="col-md-3"><strong>Giới tính:</strong> {detail.gioiTinh === "F" ? "Nữ" : "Nam"}</div>
                      <div className="col-md-6"><strong>CCCD:</strong> {detail.soCCCD || "-"}</div>
                      <div className="col-md-6"><strong>SĐT:</strong> {detail.soDienThoai || "-"}</div>
                      <div className="col-md-6"><strong>Email:</strong> {detail.email || "-"}</div>
                      <div className="col-md-6"><strong>Địa chỉ:</strong> {detail.diaChi || "-"}</div>
                      <div className="col-md-6"><strong>Nghề nghiệp:</strong> {detail.ngheNghiep || "-"}</div>
                      <div className="col-md-6"><strong>Hôn nhân:</strong> {detail.tinhTrangHonNhan || "-"}</div>
                      <div className="col-md-6"><strong>Người liên hệ:</strong> {detail.nguoiLienHe || "-"}</div>
                      <div className="col-md-6"><strong>SĐT LH:</strong> {detail.sdtLienHe || "-"}</div>
                      <div className="col-md-6"><strong>Ngày tạo:</strong> {toDateTime(detail.ngayTao)}</div>
                      <div className="col-md-6">
                        <strong>Trạng thái:</strong>{" "}
                        <span className={`badge ${Number(detail.trangThai) === 1 ? "bg-success" : "bg-secondary"}`}>
                          {Number(detail.trangThai) === 1 ? "Hoạt động" : "Ngưng"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer justify-content-center">
                  <button className="btn btn-outline-secondary" onClick={closeView}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeView} />
        </>
      )}

      {editing && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={submitEdit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Sửa hồ sơ #{editing.maBenhNhan}</h5>
                    <button type="button" className="btn-close" onClick={closeEdit}></button>
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Họ tên</label>
                        <input className="form-control" name="hoTen" value={editForm.hoTen} onChange={onEditChange} required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Ngày sinh</label>
                        <input type="date" className="form-control" name="ngaySinh" value={editForm.ngaySinh} onChange={onEditChange} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Giới tính</label>
                        <select className="form-select" name="gioiTinh" value={editForm.gioiTinh} onChange={onEditChange}>
                          <option value="M">Nam</option>
                          <option value="F">Nữ</option>
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Số CCCD</label>
                        <input className="form-control" name="soCCCD" value={editForm.soCCCD} onChange={onEditChange} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Số điện thoại</label>
                        <input className="form-control" name="soDienThoai" value={editForm.soDienThoai} onChange={onEditChange} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-control" name="email" value={editForm.email} onChange={onEditChange} />
                      </div>

                      <div className="col-md-8">
                        <label className="form-label">Địa chỉ</label>
                        <input className="form-control" name="diaChi" value={editForm.diaChi} onChange={onEditChange} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Trạng thái</label>
                        <select className="form-select" name="trangThai" value={editForm.trangThai} onChange={onEditChange}>
                          <option value={1}>Hoạt động</option>
                          <option value={0}>Khoá</option>
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Nghề nghiệp</label>
                        <input className="form-control" name="ngheNghiep" value={editForm.ngheNghiep} onChange={onEditChange} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Hôn nhân</label>
                        <input className="form-control" name="tinhTrangHonNhan" value={editForm.tinhTrangHonNhan} onChange={onEditChange} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Người liên hệ</label>
                        <input className="form-control" name="nguoiLienHe" value={editForm.nguoiLienHe} onChange={onEditChange} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">SĐT liên hệ</label>
                        <input className="form-control" name="sdtLienHe" value={editForm.sdtLienHe} onChange={onEditChange} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer justify-content-center">
                    <button type="button" className="btn btn-outline-secondary" onClick={closeEdit}>Hủy</button>
                    <button className="btn btn-primary" type="submit" disabled={saving}>
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
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

/* helpers */
function toDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return String(dt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
