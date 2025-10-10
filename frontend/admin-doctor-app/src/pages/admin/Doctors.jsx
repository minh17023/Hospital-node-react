// src/pages/admin/Doctors.jsx
import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import Layout from "../../components/Layout";

const DEFAULT_LIMIT = 12;

/* ==================== PAGE ==================== */
export default function AdminDoctors() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get("/doctors", { params: { keyword, limit, offset } });
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Lỗi tải danh sách bác sĩ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [keyword, limit, offset]);

  const next = () => setOffset((o) => Math.min(o + limit, Math.max(0, (totalPages - 1) * limit)));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  return (
    <Layout>
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý bác sĩ</h2>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Thêm bác sĩ
            </button>
          </div>

          <form className="row g-2 mb-3" onSubmit={(e) => { e.preventDefault(); setOffset(0); load(); }}>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Tìm theo tên/mã/chuyên khoa…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select className="form-select" value={limit} onChange={(e) => setLimit(+e.target.value)}>
                {[12, 20, 30, 50].map((n) => <option key={n} value={n}>{n} / trang</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" type="submit">Tìm kiếm</button>
            </div>
          </form>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 140 }}>Mã bác sĩ</th>
                  <th>Họ tên</th>
                  <th>Chuyên khoa</th>
                  <th style={{ width: 120 }}>Phí khám</th>
                  <th style={{ width: 110 }}>Trạng thái</th>
                  <th style={{ width: 150 }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!loading && items.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">Chưa có dữ liệu</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={6} className="py-4 text-center">
                    <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                  </td></tr>
                )}
                {items.map((it) => (
                  <tr key={it.maBacSi}>
                    <td><span className="badge bg-secondary">{it.maBacSi}</span></td>
                    <td>{it.tenBacSi || it.hoTen || "-"}</td>
                    <td>{it.tenChuyenKhoa || it.maChuyenKhoa}</td>
                    <td>{it.phiKham != null ? Intl.NumberFormat().format(it.phiKham) : "-"}</td>
                    <td>
                      {Number(it.trangThai) === 1
                        ? <span className="badge bg-success">Đang làm</span>
                        : <span className="badge bg-secondary">Tạm nghỉ</span>}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditItem(it)}>
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setConfirmDel({ maBacSi: it.maBacSi, tenBacSi: it.tenBacSi || it.hoTen })}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Tổng: {total} • Trang {page}/{totalPages}</small>
            <div>
              <button className="btn btn-outline-secondary me-2" disabled={page <= 1} onClick={prev}>← Trước</button>
              <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={next}>Sau →</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showCreate && (
        <DoctorModal
          title="Thêm bác sĩ"
          onClose={() => setShowCreate(false)}
          onSubmit={async (payload) => {
            try {
              await client.post("/doctors", payload);
              setShowCreate(false);
              await load();
            } catch (e) {
              console.error(e);
              alert(e?.response?.data?.message || "Không tạo được bác sĩ");
            }
          }}
        />
      )}

      {editItem && (
        <DoctorModal
          title={`Sửa bác sĩ ${editItem.tenBacSi || editItem.hoTen || editItem.maBacSi}`}
          data={editItem}
          editMode
          onClose={() => setEditItem(null)}
          onSubmit={async (payload) => {
            try {
              await client.put(`/doctors/${encodeURIComponent(editItem.maBacSi)}`, payload);
              setEditItem(null);
              await load();
            } catch (e) {
              console.error(e);
              alert(e?.response?.data?.message || "Không cập nhật được bác sĩ");
            }
          }}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          text={`Xóa bác sĩ ${confirmDel.tenBacSi || confirmDel.maBacSi}?`}
          onClose={() => setConfirmDel(null)}
          onConfirm={async () => {
            try {
              await client.delete(`/api/v1/doctors/${encodeURIComponent(confirmDel.maBacSi)}`.replace("/api/v1",""));
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

/* Select chuyên khoa (lấy từ /specialties) */
function SpecialtySelect({ value, onChange, disabled = false, size = "sm" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await client.get("/specialties");
        if (mounted) setItems(data?.items || []);
      } finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);
  return (
    <select
      className={`form-select form-select-${size}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled || loading}
    >
      <option value="">-- Chọn chuyên khoa --</option>
      {items.map((s) => (
        <option key={s.maChuyenKhoa} value={s.maChuyenKhoa}>
          {s.maChuyenKhoa} — {s.tenChuyenKhoa}
        </option>
      ))}
    </select>
  );
}

function DoctorModal({ title, data = {}, editMode = false, onClose, onSubmit }) {
  useModalChrome(onClose);

  // core fields
  const [maNhanVien, setMaNhanVien] = useState(data.maNhanVien || "");
  const [maChuyenKhoa, setMaChuyenKhoa] = useState(data.maChuyenKhoa || "");
  const [maHocVi, setMaHocVi] = useState(data.maHocVi || "");
  const [maHocHam, setMaHocHam] = useState(data.maHocHam || "");
  const [bangCap, setBangCap] = useState(data.bangCap || "");
  const [chungChi, setChungChi] = useState(data.chungChi || "");
  const [kinhNghiem, setKinhNghiem] = useState(data.kinhNghiem ?? 0);
  const [chuyenMonChinh, setChuyenMonChinh] = useState(data.chuyenMonChinh || "");
  const [chuyenMonPhu, setChuyenMonPhu] = useState(data.chuyenMonPhu || "");
  const [soLuongBenhNhanToiDa, setSL] = useState(data.soLuongBenhNhanToiDa ?? 20);
  const [thoiGianKhamBinhQuan, setTG] = useState(data.thoiGianKhamBinhQuan ?? 15);
  const [ngayBatDauCongTac, setNgay] = useState(data.ngayBatDauCongTac || "");
  const [phiKham, setPhiKham] = useState(data.phiKham ?? 0);
  const [trangThai, setTrangThai] = useState(data.trangThai ?? 1);
  const [ghiChu, setGhiChu] = useState(data.ghiChu || "");

  const submit = (e) => {
    e.preventDefault();
    if (!editMode && (!maNhanVien || !maChuyenKhoa)) {
      return alert("Vui lòng nhập mã nhân viên & chuyên khoa");
    }
    const payload = {
      ...(editMode ? {} : { maNhanVien, maChuyenKhoa }),
      maHocVi: emptyToNull(maHocVi),
      maHocHam: emptyToNull(maHocHam),
      bangCap: emptyToNull(bangCap),
      chungChi: emptyToNull(chungChi),
      kinhNghiem: n(kinhNghiem),
      chuyenMonChinh: emptyToNull(chuyenMonChinh),
      chuyenMonPhu: emptyToNull(chuyenMonPhu),
      soLuongBenhNhanToiDa: n(soLuongBenhNhanToiDa),
      thoiGianKhamBinhQuan: n(thoiGianKhamBinhQuan),
      ngayBatDauCongTac: ngayBatDauCongTac || null,
      phiKham: n(phiKham),
      trangThai: n(trangThai),
      ghiChu: emptyToNull(ghiChu),
    };
    onSubmit?.(payload);
  };

  return (
    <>
      <div
        className="modal fade show"
        role="dialog"
        tabIndex={-1}
        style={{ display: "block", zIndex: 1060 }}
        onClick={onClose}
      >
        {/* XL, centered, rộng – hạn chế phải cuộn */}
        <div
          className="modal-dialog modal-dialog-centered modal-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            {/* Không tạo scroll nội bộ */}
            <div className="modal-body" style={{ overflow: "visible" }}>
              {/* Hàng đầu: nhân viên + chuyên khoa */}
              {!editMode && (
                <div className="row g-3">
                  <div className="col-md-6 col-xl-6">
                    <label className="form-label small">Mã nhân viên <span className="text-danger">*</span></label>
                    <input
                      className="form-control form-control-sm"
                      value={maNhanVien}
                      onChange={(e) => setMaNhanVien(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="col-md-6 col-xl-6">
                    <label className="form-label small">Chuyên khoa <span className="text-danger">*</span></label>
                    <SpecialtySelect
                      value={maChuyenKhoa}
                      onChange={setMaChuyenKhoa}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {/* Lưới 3 cột trên xl, 2 cột trên md – input nhỏ */}
              <div className="row g-3 mt-1">
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Mã học vị</label>
                  <input className="form-control form-control-sm" value={maHocVi} onChange={(e) => setMaHocVi(e.target.value)} />
                </div>
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Mã học hàm</label>
                  <input className="form-control form-control-sm" value={maHocHam} onChange={(e) => setMaHocHam(e.target.value)} />
                </div>
                <div className="col-md-12 col-xl-4">
                  <label className="form-label small">Bằng cấp</label>
                  <input className="form-control form-control-sm" value={bangCap} onChange={(e) => setBangCap(e.target.value)} />
                </div>

                <div className="col-md-12 col-xl-4">
                  <label className="form-label small">Chứng chỉ</label>
                  <input className="form-control form-control-sm" value={chungChi} onChange={(e) => setChungChi(e.target.value)} />
                </div>
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Kinh nghiệm (năm)</label>
                  <input type="number" min={0} className="form-control form-control-sm"
                         value={kinhNghiem} onChange={(e) => setKinhNghiem(e.target.value)} />
                </div>
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Số BN tối đa / ca</label>
                  <input type="number" min={0} className="form-control form-control-sm"
                         value={soLuongBenhNhanToiDa} onChange={(e) => setSL(e.target.value)} />
                </div>

                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">TG khám bình quân (phút)</label>
                  <input type="number" min={0} className="form-control form-control-sm"
                         value={thoiGianKhamBinhQuan} onChange={(e) => setTG(e.target.value)} />
                </div>
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Phí khám (VNĐ)</label>
                  <input type="number" min={0} className="form-control form-control-sm"
                         value={phiKham} onChange={(e) => setPhiKham(e.target.value)} />
                </div>
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Ngày bắt đầu công tác</label>
                  <input type="date" className="form-control form-control-sm"
                         value={ngayBatDauCongTac || ""} onChange={(e) => setNgay(e.target.value)} />
                </div>

                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Trạng thái</label>
                  <select className="form-select form-select-sm" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
                    <option value={1}>Đang làm</option>
                    <option value={0}>Tạm nghỉ</option>
                  </select>
                </div>
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Chuyên môn chính</label>
                  <input className="form-control form-control-sm" value={chuyenMonChinh}
                         onChange={(e) => setChuyenMonChinh(e.target.value)} />
                </div>
                <div className="col-md-6 col-xl-4">
                  <label className="form-label small">Chuyên môn phụ</label>
                  <input className="form-control form-control-sm" value={chuyenMonPhu}
                         onChange={(e) => setChuyenMonPhu(e.target.value)} />
                </div>

                <div className="col-12">
                  <label className="form-label small">Ghi chú</label>
                  <textarea className="form-control form-control-sm" rows={2} value={ghiChu}
                            onChange={(e) => setGhiChu(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="modal-footer justify-content-center">
              <button className="btn btn-secondary" type="button" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" type="submit">
                {editMode ? "Lưu thay đổi" : "Tạo bác sĩ"}
              </button>
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
      <div className="modal fade show" role="dialog" tabIndex={-1} style={{ display: "block", zIndex: 1060 }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Xác nhận</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="m-0">{text}</p>
            </div>
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
const n = (v) => (v == null || v === "" ? 0 : Number(v));
