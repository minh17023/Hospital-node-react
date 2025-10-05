import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

const DEFAULT_PAGE_SIZE = 8;

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
  // filters
  const [q, setQ] = useState("");
  const [trangThai, setTrangThai] = useState(""); // "" | "1" | "0"
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // view modal
  const [viewing, setViewing] = useState(null); // maBenhNhan
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // edit modal
  const [editing, setEditing] = useState(null); // patient object
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // delete
  const [deleting, setDeleting] = useState(false);

  // alert banner (không cần provider)
  const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
  const flash = (message, type = "success", timeout = 2500) => {
    setAlert({ show: true, type, message });
    if (timeout) setTimeout(() => setAlert((s) => ({ ...s, show: false })), timeout);
  };

  const loadData = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = {
        q: q.trim() || undefined,
        trangThai: trangThai !== "" ? Number(trangThai) : undefined,
        from: from || undefined,
        to: to || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy: "ngayTao",
        order: "DESC",
      };
      const { data } = await client.get("/patients", { params });
      setRows(data?.items || []);
      setTotal(Number(data?.total || 0));
    } catch (e2) {
      const msg = e2?.response?.data?.message || "Không tải được danh sách bệnh nhân";
      setErr(msg);
      flash(msg, "danger");
    } finally {
      setLoading(false);
    }
  };

  // tải khi đổi trang/kích thước
  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const onSubmitFilters = async (e) => {
    e.preventDefault();
    setPage(1);
    await loadData();
    flash("Đã tải dữ liệu theo bộ lọc");
  };

  function clearFilters() {
    setQ("");
    setTrangThai("");
    setFrom("");
    setTo("");
    setPage(1);
    loadData().then(() => flash("Đã xóa bộ lọc", "info"));
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );
  const pageSafe = Math.min(page, totalPages);

  // ===== View =====
  async function openView(ma) {
    setViewing(ma);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await client.get(`/patients/${ma}`);
      setDetail(data?.patient || null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }
  function closeView() {
    setViewing(null);
    setDetail(null);
  }

  // ===== Edit =====
  async function openEdit(ma) {
    try {
      const { data } = await client.get(`/patients/${ma}`);
      const p = data?.patient || {};
      setEditing(p);
      setEditForm({
        hoTen: p.hoTen || "",
        ngaySinh: p.ngaySinh || "",
        gioiTinh: (p.gioiTinh === "M" || p.gioiTinh === 1 || p.gioiTinh === "1") ? "M"
                : (p.gioiTinh === "F" || p.gioiTinh === 2 || p.gioiTinh === "2") ? "F"
                : "M", // mặc định M
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
  function closeEdit() { setEditing(null); setEditForm({}); }
  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {};
      Object.keys(editForm).forEach(k => {
        // Map giới tính về M/F
        const newVal = (k === "gioiTinh")
          ? (editForm[k] === "F" ? "F" : "M")
          : editForm[k];

      // so sánh chuỗi cho đơn giản
        if (String(newVal) !== String(editing[k] ?? "")) payload[k] = newVal;
      });
      if (Object.keys(payload).length === 0) { closeEdit(); return; }
      await client.put(`/patients/${editing.maBenhNhan}`, payload);
      closeEdit();
      await loadData();
      flash("Đã cập nhật hồ sơ bệnh nhân");
    } catch (er) {
      flash(er?.response?.data?.message || "Cập nhật thất bại", "danger");
    } finally {
      setSaving(false);
    }
  }

  // ===== Delete =====
  async function removeRow(ma, hoTen) {
    if (!window.confirm(`Xoá hồ sơ bệnh nhân "${hoTen}" (${ma})?`)) return;
    setDeleting(true);
    try {
      await client.delete(`/patients/${ma}`);
      if ((rows.length === 1) && page > 1) setPage(p => p - 1);
      await loadData();
      flash("Đã xoá hồ sơ bệnh nhân");
    } catch (e) {
      flash(e?.response?.data?.message || "Xoá thất bại", "danger");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      <div className="container-fluid px-0">
        <h3 className="mb-3">Quản lý bệnh nhân</h3>

        {/* Alerts */}
        <AlertBanner
          visible={alert.show}
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(s => ({ ...s, show: false }))}
        />

        {/* Filter card */}
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <form onSubmit={onSubmitFilters}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small">Tìm kiếm (tên/CCCD/SĐT/email/Mã)</label>
                  <input
                    className="form-control"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nhập từ khóa…"
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label small">Trạng thái</label>
                  <select
                    className="form-select"
                    value={trangThai}
                    onChange={(e) => setTrangThai(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="1">Hoạt động</option>
                    <option value="0">Ngưng</option>
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label small">Từ ngày (ngày tạo)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label small">Đến ngày (ngày tạo)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label small">Số dòng / trang</label>
                  <select
                    className="form-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={24}>24</option>
                  </select>
                </div>

                <div className="col-12 d-flex gap-2">
                  <button className="btn btn-primary" type="submit">
                    Tải dữ liệu
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={clearFilters}
                  >
                    Xóa lọc
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {err && <div className="alert alert-danger">{err}</div>}

        {/* Table (không tạo scroll dọc, chỉ scroll ngang nếu tràn) */}
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ whiteSpace: "nowrap" }}>Mã</th>
                    <th>Họ tên</th>
                    <th>Ngày sinh</th>
                    <th>Giới tính</th>
                    <th>CCCD</th>
                    <th>SĐT</th>
                    <th>Email</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                    <th width="1%"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10}>Đang tải…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={10}>Không có dữ liệu</td></tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.maBenhNhan}>
                        <td className="text-nowrap">{r.maBenhNhan}</td>
                        <td>{r.hoTen}</td>
                        <td className="text-nowrap">{r.ngaySinh}</td>
                        <td>
                          { (r.gioiTinh === "F" || r.gioiTinh === 2 || r.gioiTinh === "2") ? "Nữ" : "Nam" }
                        </td>
                        <td className="text-nowrap">{r.soCCCD || "-"}</td>
                        <td className="text-nowrap">{r.soDienThoai || "-"}</td>
                        <td className="text-nowrap">{r.email || "-"}</td>
                        <td className="text-nowrap">{toDateTime(r.ngayTao)}</td>
                        <td>
                          <span className={`badge ${Number(r.trangThai) === 1 ? "bg-success" : "bg-secondary"}`}>
                            {Number(r.trangThai) === 1 ? "Hoạt động" : "Ngưng"}
                          </span>
                        </td>
                        <td className="text-nowrap">
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openView(r.maBenhNhan)}
                          >
                            Xem
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => openEdit(r.maBenhNhan)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={deleting}
                            onClick={() => removeRow(r.maBenhNhan, r.hoTen)}
                          >
                            Xoá
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">
                Hiển thị {total === 0 ? 0 : (pageSafe - 1) * pageSize + 1}–
                {Math.min(pageSafe * pageSize, total)} / {total} bệnh nhân
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${pageSafe <= 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(1)}>&laquo;</button>
                  </li>
                  <li className={`page-item ${pageSafe <= 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>Trước</button>
                  </li>
                  <li className="page-item disabled">
                    <span className="page-link">{pageSafe}/{totalPages}</span>
                  </li>
                  <li className={`page-item ${pageSafe >= totalPages ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Sau</button>
                  </li>
                  <li className={`page-item ${pageSafe >= totalPages ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(totalPages)}>&raquo;</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* View modal */}
      {viewing && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.3)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Hồ sơ bệnh nhân #{viewing}</h5>
                <button type="button" className="btn-close" onClick={closeView}></button>
              </div>
              <div className="modal-body">
                {detailLoading ? (
                  <div>Đang tải…</div>
                ) : !detail ? (
                  <div className="text-danger">Không tải được dữ liệu.</div>
                ) : (
                  <div className="row g-3">
                    <div className="col-md-6"><strong>Họ tên:</strong> {detail.hoTen}</div>
                    <div className="col-md-3"><strong>Ngày sinh:</strong> {detail.ngaySinh}</div>
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
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={closeView}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.3)" }}>
          <div className="modal-dialog modal-lg">
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
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeEdit}>Hủy</button>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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
