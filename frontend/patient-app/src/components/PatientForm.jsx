import { useState } from "react";

const init = (cccd) => ({
  soCCCD: cccd || "",
  hoTen: "",
  ngaySinh: "",
  gioiTinh: "",  // "M" | "F"
  soDienThoai: "",
  diaChi: "",
  email: "",
  ngheNghiep: "",
  tinhTrangHonNhan: "",
  nguoiLienHe: "",
  sdtLienHe: "",
  nguoiTao: "kiosk" // cho phép sửa nếu muốn
});

export default function PatientForm({ cccd, loading, onSubmit }) {
  const [f, setF] = useState(init(cccd));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const valid = f.soCCCD?.length === 12 && f.hoTen && f.ngaySinh && (f.gioiTinh === "M" || f.gioiTinh === "F");
  return (
    <div className="card">
      <div className="grid2">
        <div>
          <label>Số CCCD *</label>
          <input value={f.soCCCD} onChange={set("soCCCD")} placeholder="12 số" />
        </div>
        <div>
          <label>Họ và tên *</label>
          <input value={f.hoTen} onChange={set("hoTen")} />
        </div>
        <div>
          <label>Ngày sinh *</label>
          <input type="date" value={f.ngaySinh} onChange={set("ngaySinh")} />
        </div>
        <div>
          <label>Giới tính *</label>
          <select value={f.gioiTinh} onChange={set("gioiTinh")}>
            <option value="">Chọn giới tính</option>
            <option value="M">Nam</option>
            <option value="F">Nữ</option>
          </select>
        </div>
        <div>
          <label>Số điện thoại</label>
          <input value={f.soDienThoai} onChange={set("soDienThoai")} />
        </div>
        <div>
          <label>Email</label>
          <input value={f.email} onChange={set("email")} />
        </div>
        <div className="col2">
          <label>Địa chỉ</label>
          <input value={f.diaChi} onChange={set("diaChi")} />
        </div>
        <div>
          <label>Nghề nghiệp</label>
          <input value={f.ngheNghiep} onChange={set("ngheNghiep")} />
        </div>
        <div>
          <label>Tình trạng hôn nhân</label>
          <input value={f.tinhTrangHonNhan} onChange={set("tinhTrangHonNhan")} />
        </div>
        <div>
          <label>Người liên hệ</label>
          <input value={f.nguoiLienHe} onChange={set("nguoiLienHe")} />
        </div>
        <div>
          <label>SĐT liên hệ</label>
          <input value={f.sdtLienHe} onChange={set("sdtLienHe")} />
        </div>
        <div>
          <label>Người tạo</label>
          <input value={f.nguoiTao} onChange={set("nguoiTao")} />
        </div>
      </div>

      <button className="btn primary" disabled={!valid || loading} onClick={() => onSubmit(f)}>
        {loading ? "Đang lưu..." : "Xác nhận thông tin"}
      </button>
    </div>
  );
}
