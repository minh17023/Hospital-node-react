import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import Layout from "../../components/Layout";

const DEFAULT_LIMIT = 10;

/* ==================== PAGE ==================== */
export default function AdminSpecialties() {
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);  // lấy 1 lần từ API (API không có phân trang)
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [page, setPage] = useState(1);

  const items = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = !kw
      ? allItems
      : allItems.filter((x) =>
          [x.maChuyenKhoa, x.tenChuyenKhoa, x.phongKham, x.moTa]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(kw))
        );
    const start = (page - 1) * limit;
    return { list: filtered.slice(start, start + limit), total: filtered.length };
  }, [allItems, keyword, page, limit]);

  const totalPages = Math.max(1, Math.ceil(items.total / limit));

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get("/specialties");
      setAllItems(data.items || []);
      setPage(1);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Lỗi tải danh sách chuyên khoa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  return (
    <Layout>
      <div className="card">
        {/* card-body dùng layout co giãn theo chiều dọc */}
        <div className="card-body page-flex">
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý chuyên khoa</h2>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Thêm chuyên khoa
            </button>
          </div>

          {/* Filters */}
          <form
            className="row g-2 mb-2 filters"
            onSubmit={(e) => { e.preventDefault(); setPage(1); }}
          >
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Tìm theo tên/mã/phòng khám/mô tả…"
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              />
            </div>
          </form>

          {/* Bảng trong vùng scroll, header sticky */}
          <div className="table-zone">
            <div className="table-responsive">
              <table className="table table-hover align-middle table-sticky table-tight mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 120 }}>Mã CK</th>
                    <th>Tên chuyên khoa</th>
                    <th style={{ width: 150 }}>Phòng khám</th>
                    <th style={{ width: 120 }} className="text-end">Phí khám</th>
                    <th style={{ width: 120 }} className="text-center">TG khám (p)</th>
                    <th style={{ width: 110 }} className="text-center">Số bác sĩ</th>
                    <th style={{ width: 110 }} className="text-center">Trạng thái</th>
                    <th style={{ width: 140 }} className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && items.list.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading…</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {items.list.map((it) => (
                    <tr key={it.maChuyenKhoa}>
                      <td><span className="badge bg-secondary">{it.maChuyenKhoa}</span></td>
                      <td>
                        <div className="fw-semibold">{it.tenChuyenKhoa}</div>
                        {it.moTa ? <small className="text-muted">{it.moTa}</small> : null}
                      </td>
                      <td>{it.phongKham || "-"}</td>
                      <td className="text-end">
                        {it.phiKham != null ? Intl.NumberFormat().format(it.phiKham) : "-"}
                      </td>
                      <td className="text-center">{it.thoiGianKhamBinhQuan ?? "-"}</td>
                      <td className="text-center">{it.soBacSi}</td>
                      <td className="text-center">
                        {Number(it.trangThai) === 1
                          ? <span className="badge bg-success">Hoạt động</span>
                          : <span className="badge bg-secondary">Ẩn</span>}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => setEditItem(it)}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setConfirmDel({ maChuyenKhoa: it.maChuyenKhoa, ten: it.tenChuyenKhoa })}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination – luôn nằm dưới cùng card nhờ page-flex */}
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">
              Tổng: {items.total} • Trang {page}/{totalPages}
            </small>
            <div>
              <button
                className="btn btn-outline-secondary me-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>
              <button
                className="btn btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showCreate && (
        <SpecialtyModal
          title="Thêm chuyên khoa"
          onClose={() => setShowCreate(false)}
          onSubmit={async (payload) => {
            try {
              await client.post("/specialties", payload);
              setShowCreate(false);
              await load();
            } catch (e) {
              console.error(e);
              alert(e?.response?.data?.message || "Không tạo được chuyên khoa");
            }
          }}
        />
      )}

      {editItem && (
        <SpecialtyModal
          title={`Sửa chuyên khoa ${editItem.tenChuyenKhoa}`}
          data={editItem}
          editMode
          onClose={() => setEditItem(null)}
          onSubmit={async (payload) => {
            try {
              await client.put(`/specialties/${encodeURIComponent(editItem.maChuyenKhoa)}`, payload);
              setEditItem(null);
              await load();
            } catch (e) {
              console.error(e);
              alert(e?.response?.data?.message || "Không cập nhật được chuyên khoa");
            }
          }}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          text={`Xóa chuyên khoa ${confirmDel.ten}?`}
          onClose={() => setConfirmDel(null)}
          onConfirm={async () => {
            try {
              await client.delete(`/specialties/${encodeURIComponent(confirmDel.maChuyenKhoa)}`);
              setConfirmDel(null);
              await load();
            } catch (e) {
              alert(e?.response?.data?.message || "Không xóa được");
            }
          }}
        />
      )}
    </Layout>
  );
}

/* ==================== MODALS ==================== */
function useModalChrome(onClose) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);
}

function SpecialtyModal({ title, data = {}, editMode = false, onClose, onSubmit }) {
  useModalChrome(onClose);

  const [tenChuyenKhoa, setTen] = useState(data.tenChuyenKhoa || "");
  const [moTa, setMoTa] = useState(data.moTa || "");
  const [truongKhoa, setTruongKhoa] = useState(data.truongKhoa || "");
  const [phongKham, setPhongKham] = useState(data.phongKham || "");
  const [trangThai, setTrangThai] = useState(data.trangThai ?? 1);

  const submit = (e) => {
    e.preventDefault();
    if (!tenChuyenKhoa.trim()) return alert("Nhập tên chuyên khoa");
    const payload = {
      tenChuyenKhoa: tenChuyenKhoa.trim(),
      moTa: emptyToNull(moTa),
      truongKhoa: emptyToNull(truongKhoa),
      phongKham: emptyToNull(phongKham),
      trangThai: Number(trangThai) || 0,
    };
    onSubmit?.(payload);
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "block", zIndex: 1060 }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-md" onClick={(e) => e.stopPropagation()}>
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Tên chuyên khoa <span className="text-danger">*</span></label>
                  <input className="form-control" value={tenChuyenKhoa} onChange={(e) => setTen(e.target.value)} autoFocus />
                </div>
                <div className="col-12">
                  <label className="form-label">Mô tả</label>
                  <textarea className="form-control" rows={2} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Trưởng khoa (mã/ghi chú)</label>
                  <input className="form-control" value={truongKhoa} onChange={(e) => setTruongKhoa(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phòng khám</label>
                  <input className="form-control" value={phongKham} onChange={(e) => setPhongKham(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
                    <option value={1}>Hoạt động</option>
                    <option value={0}>Ẩn</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer justify-content-center">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary">{editMode ? "Lưu thay đổi" : "Tạo chuyên khoa"}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
    </>
  );
}

function ConfirmModal({ text, onClose, onConfirm }) {
  useModalChrome(onClose);
  return (
    <>
      <div className="modal fade show" style={{ display: "block", zIndex: 1060 }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Xác nhận</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body"><p className="m-0">{text}</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button className="btn btn-danger" onClick={onConfirm}>Xóa</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
    </>
  );
}

/* helpers */
const emptyToNull = (v) => (v == null || String(v).trim() === "" ? null : v);
