import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

/* ===== Helpers ===== */
const ROLES = { 1: "ADMIN", 2: "DOCTOR", 3: "STAFF" };
const roleName = (n) => ROLES[Number(n)] || `#${n}`;
const yesNo = (n) => (Number(n) === 1 ? "Hoạt động" : "Ngưng");
const badge = (n) => (Number(n) === 1 ? "bg-success" : "bg-secondary");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "-");

/* ===== Async load doctors (no search box) ===== */
function useDoctors() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await client.get("/doctors", { params: { limit: 1000, offset: 0 } });
        if (ok) setItems(data?.items || []);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, []);
  return { items, loading };
}

function SelectDoctor({ value, onChange, size = "sm", allowNone = false }) {
  const { items, loading } = useDoctors();
  return (
    <select
      className={`form-select form-select-${size}`}
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={loading}
    >
      {allowNone
        ? <option value="">(không liên kết)</option>
        : <option value="">-- Chọn bác sĩ --</option>}
      {items.map((d) => (
        <option key={d.maBacSi} value={d.maBacSi}>
          {d.maBacSi} — {d.tenBacSi || d.hoTen || "(chưa có tên)"}
        </option>
      ))}
    </select>
  );
}

/* ====== Create Modal ====== */
function CreateModal({ onClose, onDone }) {
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [vaiTro, setVaiTro] = useState(2); // default DOCTOR
  const [maBacSi, setMaBacSi] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!tenDangNhap || !matKhau) return alert("Nhập tối thiểu tên đăng nhập và mật khẩu");

    setSaving(true);
    try {
      if (Number(vaiTro) === 2 && maBacSi) {
        // API tạo user cho bác sĩ có sẵn
        await client.post("/auth/doctor/register-user", {
          tenDangNhap,
          matKhau,
          email: email || null,
          maBacSi,
        });
      } else {
        // API create chung (nếu có trên backend của bạn)
        await client.post("/users", {
          tenDangNhap,
          matKhau,
          email: email || null,
          vaiTro: Number(vaiTro),
        });
      }
      onDone?.();
      onClose?.();
    } catch (e2) {
      alert(e2?.response?.data?.message || "Không tạo được tài khoản");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Thêm tài khoản</h5>
              <button className="btn-close" type="button" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Tên đăng nhập *</label>
                  <input className="form-control form-control-sm" value={tenDangNhap} onChange={(e) => setTenDangNhap(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Email</label>
                  <input className="form-control form-control-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Mật khẩu *</label>
                  <input className="form-control form-control-sm" type="password" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Vai trò</label>
                  <select className="form-select form-select-sm" value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
                    <option value={1}>ADMIN</option>
                    <option value={2}>DOCTOR</option>
                    <option value={3}>STAFF</option>
                  </select>
                </div>
                {Number(vaiTro) === 2 && (
                  <div className="col-md-6">
                    <label className="form-label small">Bác sĩ (liên kết vào user)</label>
                    <SelectDoctor value={maBacSi} onChange={setMaBacSi} />
                    <div className="form-text">
                      Khi chọn bác sĩ, hệ thống sẽ dùng API <code>/doctor/register-user</code>.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer justify-content-center">
              <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu…" : "Tạo mới"}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

/* ====== Edit Modal ====== */
function EditModal({ row, onClose, onDone }) {
  const [email, setEmail] = useState(row.email || "");
  const [vaiTro, setVaiTro] = useState(row.vaiTro);
  const [trangThai, setTrangThai] = useState(row.trangThai);
  const [maBacSi, setMaBacSi] = useState(row.maBacSi || "");
  const [matKhau, setMatKhau] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await client.put(`/users/${encodeURIComponent(row.maUser)}`, {
        email: email || null,
        vaiTro: Number(vaiTro),
        trangThai: Number(trangThai),
        maBacSi: maBacSi || null, // gỡ liên kết khi rỗng
        matKhau: matKhau ? matKhau : undefined,
      });
      onDone?.();
      onClose?.();
    } catch (e2) {
      alert(e2?.response?.data?.message || "Không cập nhật được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Sửa user: {row.tenDangNhap}</h5>
              <button className="btn-close" type="button" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Email</label>
                  <input className="form-control form-control-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Đổi mật khẩu</label>
                  <input className="form-control form-control-sm" type="password" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} placeholder="Để trống nếu không đổi" />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Vai trò</label>
                  <select className="form-select form-select-sm" value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
                    <option value={1}>ADMIN</option>
                    <option value={2}>DOCTOR</option>
                    <option value={3}>STAFF</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Trạng thái</label>
                  <select className="form-select form-select-sm" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
                    <option value={1}>Hoạt động</option>
                    <option value={0}>Ngưng</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Liên kết bác sĩ</label>
                  <SelectDoctor value={maBacSi} onChange={setMaBacSi} allowNone />
                </div>
              </div>
            </div>
            <div className="modal-footer justify-content-center">
              <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

/* ====== Page ====== */
export default function AdminUsers() {
  // filters
  const [q, setQ] = useState("");
  const [vaiTro, setVaiTro] = useState("ALL");
  const [trangThai, setTrangThai] = useState("ALL");

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // paging (fixed 12/trang)
  const [limit] = useState(12);
  const [offset, setOffset] = useState(0);
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get("/users", {
        params: {
          q: q || undefined,
          vaiTro: vaiTro === "ALL" ? undefined : Number(vaiTro),
          trangThai: trangThai === "ALL" ? undefined : Number(trangThai),
          limit,
          offset,
        },
      });
      setRows(data?.items || []);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      alert(e?.response?.data?.message || "Không tải được danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }

  // tải theo trang
  useEffect(() => { load(); }, [limit, offset]); // eslint-disable-line
  // auto load khi đổi filter
  useEffect(() => { setOffset(0); load(); }, [q, vaiTro, trangThai]); // eslint-disable-line

  const next = () => setOffset((o) => Math.min(o + limit, Math.max(0, (totalPages - 1) * limit)));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  return (
    <Layout>
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý người dùng</h2>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Thêm user</button>
            </div>
          </div>

          {/* Filters (auto load) */}
          <div className="row g-2 mb-3">
            <div className="col-md-4">
              <input className="form-control" placeholder="Từ khóa (username / email)" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
                <option value="ALL">Tất cả vai trò</option>
                <option value="1">ADMIN</option>
                <option value="2">DOCTOR</option>
                <option value="3">STAFF</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Ngưng</option>
              </select>
            </div>
            <div className="col-md-2 d-flex">
              <button
                type="button"
                className="btn btn-outline-dark ms-auto"
                onClick={() => { setQ(""); setVaiTro("ALL"); setTrangThai("ALL"); }}
              >
                Xóa lọc
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 130 }}>Mã</th>
                  <th style={{ minWidth: 200 }}>Tên đăng nhập</th>
                  <th style={{ minWidth: 220 }}>Email</th>
                  <th style={{ width: 130 }}>Vai trò</th>
                  <th style={{ width: 120 }}>Trạng thái</th>
                  <th style={{ width: 150 }}>Mã bác sĩ</th>
                  <th style={{ minWidth: 180 }}>Ngày tạo</th>
                  <th className="text-end" style={{ width: 150 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center">
                      <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-muted">Chưa có dữ liệu</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.maUser}>
                    <td><span className="badge bg-secondary">{r.maUser}</span></td>
                    <td className="text-nowrap">{r.tenDangNhap}</td>
                    <td>{r.email || "-"}</td>
                    <td>{roleName(r.vaiTro)}</td>
                    <td><span className={`badge ${badge(r.trangThai)}`}>{yesNo(r.trangThai)}</span></td>
                    <td>{r.maBacSi || "-"}</td>
                    <td>{fmtDateTime(r.ngayTao)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditing(r)}>Sửa</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDel(r)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Tổng: {total} • Trang {page}/{totalPages}</small>
            <div>
              <button className="btn btn-outline-secondary me-2" disabled={page <= 1} onClick={prev}>← Trước</button>
              <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={next}>Sau →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onDone={load} />}
      {editing && <EditModal row={editing} onClose={() => setEditing(null)} onDone={load} />}

      {confirmDel && (
        <>
          <div className="modal fade show" style={{ display: "block" }} onClick={() => setConfirmDel(null)}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Xác nhận</h5>
                  <button className="btn-close" onClick={() => setConfirmDel(null)} />
                </div>
                <div className="modal-body">
                  Xóa tài khoản <strong>{confirmDel.tenDangNhap}</strong>?
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Hủy</button>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      try {
                        await client.delete(`/users/${encodeURIComponent(confirmDel.maUser)}`);
                        setConfirmDel(null);
                        await load();
                      } catch (e) {
                        alert(e?.response?.data?.message || "Không xóa được");
                      }
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setConfirmDel(null)} />
        </>
      )}
    </Layout>
  );
}
