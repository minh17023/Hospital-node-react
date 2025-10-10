// frontend/admin-doctor-app/src/pages/doctor/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

function getMe() {
  try { return JSON.parse(localStorage.getItem("ME") || "null"); }
  catch { return null; }
}

const numberOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const sliceDate = (d) => (d ? String(d).slice(0, 10) : "");

export default function Profile() {
  const me = useMemo(() => getMe() || {}, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [maBacSi, setMaBacSi] = useState(null);
  const [form, setForm] = useState({
    tenBacSi: "",
    maChuyenKhoa: "",
    tenChuyenKhoa: "",
    bangCap: "",
    chungChi: "",
    kinhNghiem: 0,
    chuyenMonChinh: "",
    chuyenMonPhu: "",
    soLuongBenhNhanToiDa: 20,
    thoiGianKhamBinhQuan: 15,
    ngayBatDauCongTac: "",
    phiKham: 0,
    ghiChu: "",
  });

  useEffect(() => {
    loadProfile();
  
  }, []);

  async function loadProfile() {
    setLoading(true); setError(""); setOk("");
    try {
      if (!me?.maUser) throw new Error("Không có maUser trong phiên đăng nhập");

      // ✅ GỌI API MỚI: /doctors/by-user/:maUser
      const { data } = await client.get(`/doctors/by-user/${me.maUser}`);

      setMaBacSi(data.maBacSi);
      setForm({
        tenBacSi: data.tenBacSi || me.hoTen || "",
        maChuyenKhoa: data.maChuyenKhoa || "",
        tenChuyenKhoa: data.tenChuyenKhoa || "",
        bangCap: data.bangCap || "",
        chungChi: data.chungChi || "",
        kinhNghiem: Number(data.kinhNghiem ?? 0),
        chuyenMonChinh: data.chuyenMonChinh || "",
        chuyenMonPhu: data.chuyenMonPhu || "",
        soLuongBenhNhanToiDa: Number(data.soLuongBenhNhanToiDa ?? 20),
        thoiGianKhamBinhQuan: Number(data.thoiGianKhamBinhQuan ?? 15),
        ngayBatDauCongTac: sliceDate(data.ngayBatDauCongTac),
        phiKham: Number(data.phiKham ?? 0),
        ghiChu: data.ghiChu || "",
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Lỗi tải hồ sơ");
    } finally {
      setLoading(false);
    }
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  async function save() {
    if (!maBacSi) return;
    setSaving(true); setError(""); setOk("");
    try {
      const payload = {
        tenBacSi: form.tenBacSi,              // alias, backend có thể bỏ qua
        bangCap: form.bangCap || null,
        chungChi: form.chungChi || null,
        kinhNghiem: numberOrNull(form.kinhNghiem),
        chuyenMonChinh: form.chuyenMonChinh || null,
        chuyenMonPhu: form.chuyenMonPhu || null,
        soLuongBenhNhanToiDa: numberOrNull(form.soLuongBenhNhanToiDa),
        thoiGianKhamBinhQuan: numberOrNull(form.thoiGianKhamBinhQuan),
        ngayBatDauCongTac: form.ngayBatDauCongTac || null,
        phiKham: numberOrNull(form.phiKham),
        ghiChu: form.ghiChu || null,
      };

      const { data } = await client.put(`/doctors/${maBacSi}`, payload);

      setOk("Đã lưu thay đổi.");
      setForm(f => ({
        ...f,
        tenBacSi: data.tenBacSi || f.tenBacSi,
        bangCap: data.bangCap || "",
        chungChi: data.chungChi || "",
        kinhNghiem: Number(data.kinhNghiem ?? f.kinhNghiem),
        chuyenMonChinh: data.chuyenMonChinh || "",
        chuyenMonPhu: data.chuyenMonPhu || "",
        soLuongBenhNhanToiDa: Number(data.soLuongBenhNhanToiDa ?? f.soLuongBenhNhanToiDa),
        thoiGianKhamBinhQuan: Number(data.thoiGianKhamBinhQuan ?? f.thoiGianKhamBinhQuan),
        ngayBatDauCongTac: sliceDate(data.ngayBatDauCongTac || f.ngayBatDauCongTac),
        phiKham: Number(data.phiKham ?? f.phiKham),
        ghiChu: data.ghiChu || "",
      }));
    } catch (e) {
      setError(e?.response?.data?.message || "Lưu hồ sơ thất bại");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(""), 2500);
    }
  }

  return (
    <Layout>
      <div className="container-fluid py-3" style={{ overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
        <h3 className="mb-3">Hồ sơ bác sĩ</h3>

        {loading ? (
          <div className="alert alert-info">Đang tải hồ sơ…</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <label className="form-label">Họ và tên *</label>
                <input
                className="form-control"
                value={form.tenBacSi}
                disabled
                aria-disabled="true"
                style={{ userSelect: "none" }}
                title="Thông tin được lấy từ hồ sơ nhân viên — không thể chỉnh sửa tại đây"
                />

                <div className="col-md-3">
                  <label className="form-label">Mã chuyên khoa</label>
                  <input className="form-control" value={form.maChuyenKhoa} disabled />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Tên chuyên khoa</label>
                  <input className="form-control" value={form.tenChuyenKhoa} disabled />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Bằng cấp</label>
                  <input className="form-control" name="bangCap" value={form.bangCap} onChange={onChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Chứng chỉ</label>
                  <input className="form-control" name="chungChi" value={form.chungChi} onChange={onChange} />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Kinh nghiệm (năm)</label>
                  <input type="number" min="0" className="form-control"
                         name="kinhNghiem" value={form.kinhNghiem} onChange={onChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Số BN tối đa/ca</label>
                  <input type="number" min="1" className="form-control"
                         name="soLuongBenhNhanToiDa" value={form.soLuongBenhNhanToiDa} onChange={onChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">TG khám bình quân (phút)</label>
                  <input type="number" min="5" className="form-control"
                         name="thoiGianKhamBinhQuan" value={form.thoiGianKhamBinhQuan} onChange={onChange} />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Chuyên môn chính</label>
                  <input className="form-control" name="chuyenMonChinh" value={form.chuyenMonChinh} onChange={onChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Chuyên môn phụ</label>
                  <input className="form-control" name="chuyenMonPhu" value={form.chuyenMonPhu} onChange={onChange} />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Ngày bắt đầu công tác</label>
                  <input type="date" className="form-control"
                         name="ngayBatDauCongTac" value={form.ngayBatDauCongTac} onChange={onChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phí khám (đ)</label>
                  <input type="number" min="0" className="form-control"
                         name="phiKham" value={form.phiKham} onChange={onChange} />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Ghi chú</label>
                  <textarea className="form-control" rows={3}
                            name="ghiChu" value={form.ghiChu} onChange={onChange} />
                </div>
              </div>

              {ok && <div className="alert alert-success mt-3 py-2">{ok}</div>}
              {error && !loading && <div className="alert alert-danger mt-3 py-2">{error}</div>}

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary" onClick={save} disabled={saving || !maBacSi}>
                  {saving ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
                <button className="btn btn-outline-secondary" onClick={loadProfile} disabled={saving}>
                  Tải lại
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
