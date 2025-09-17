import { useEffect, useMemo, useState } from "react";
import s from "./PatientForm.module.css";

const init = (cccd) => ({
  soCCCD: cccd || "",
  hoTen: "",
  ngaySinh: "",
  gioiTinh: "",
  soDienThoai: "",
  email: "",
  diaChi: "",
  ngheNghiep: "",
  tinhTrangHonNhan: "",
  nguoiLienHe: "",
  sdtLienHe: "",
  nguoiTao: ""
});

const isFuture = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
};

export default function PatientForm({ cccd, loading, onSubmit }) {
  const [f, setF] = useState(init(cccd));
  const [touched, setTouched] = useState({});

  // Đồng bộ CCCD từ props (ví dụ lấy từ localStorage)
  useEffect(() => {
    if (cccd) setF((prev) => ({ ...prev, soCCCD: cccd }));
  }, [cccd]);

  // Helpers nhập liệu
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setNum = (k, maxLen) => (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, maxLen);
    setF((x) => ({ ...x, [k]: v }));
  };
  const onBlur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  // Validate
  const errors = useMemo(() => {
    const err = {};

    // CCCD
    if (!f.soCCCD) err.soCCCD = "Vui lòng nhập số CCCD";
    else if (!/^\d{12}$/.test(f.soCCCD)) err.soCCCD = "CCCD phải gồm 12 chữ số";

    // Họ tên
    if (!f.hoTen.trim()) err.hoTen = "Vui lòng nhập họ và tên";
    else if (f.hoTen.trim().length < 2) err.hoTen = "Họ tên quá ngắn";

    // Ngày sinh
    if (!f.ngaySinh) err.ngaySinh = "Vui lòng chọn ngày sinh";
    else if (isFuture(f.ngaySinh)) err.ngaySinh = "Ngày sinh không hợp lệ";

    // Giới tính
    if (!(f.gioiTinh === "M" || f.gioiTinh === "F"))
      err.gioiTinh = "Vui lòng chọn giới tính";

    // Điện thoại: bắt buộc 10 số
    const phone10 = /^\d{10}$/;
    if (!f.soDienThoai) err.soDienThoai = "Vui lòng nhập SĐT (10 số)";
    else if (!phone10.test(f.soDienThoai)) err.soDienThoai = "SĐT phải đúng 10 số";

    // SĐT liên hệ: không bắt buộc, nếu nhập phải 10 số
    if (f.sdtLienHe && !phone10.test(f.sdtLienHe))
      err.sdtLienHe = "SĐT liên hệ phải đúng 10 số";

    // Email
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email))
      err.email = "Email không hợp lệ";

    return err;
  }, [f]);

  const hasError = Object.keys(errors).length > 0;
  const submitDisabled = loading || hasError;

  const submit = (e) => {
    e.preventDefault();
    setTouched({
      soCCCD: true, hoTen: true, ngaySinh: true, gioiTinh: true,
      soDienThoai: true, email: true, diaChi: true, ngheNghiep: true,
      tinhTrangHonNhan: true, nguoiLienHe: true, sdtLienHe: true, nguoiTao: true
    });
    if (submitDisabled) return;

    onSubmit({
      ...f,
      soCCCD: f.soCCCD.trim(),
      hoTen: f.hoTen.trim(),
      email: f.email.trim(),
      diaChi: f.diaChi.trim(),
      nguoiTao: f.nguoiTao?.trim() || "kiosk"
    });
  };

  const fields = [
    ["Số CCCD *", "soCCCD", "cccd"],
    ["Họ và tên *", "hoTen"],
    ["Ngày sinh *", "ngaySinh", "date"],
    ["Giới tính *", "gioiTinh", "select"],
    ["Số điện thoại *", "soDienThoai", "phone"],
    ["Email", "email", "email"],
    ["Địa chỉ", "diaChi", "text", "col-12"],
    ["Nghề nghiệp", "ngheNghiep"],
    ["Tình trạng hôn nhân", "tinhTrangHonNhan"],
    ["Người liên hệ", "nguoiLienHe"],
    ["SĐT liên hệ", "sdtLienHe", "phone"],
    ["Người tạo", "nguoiTao"]
  ];

  const invalidCls = (k) => (touched[k] && errors[k] ? "is-invalid" : "");

  return (
    <form className="row g-3" onSubmit={submit} noValidate>
      {fields.map(([label, key, type = "text", col = "col-md-6"]) => (
        <div className={col} key={key}>
          <label className={`form-label ${s.label}`}>{label}</label>

          {type === "select" ? (
            <>
              <select
                className={`form-select ${s.control} ${invalidCls(key)}`}
                value={f[key]}
                onChange={set(key)}
                onBlur={onBlur(key)}
                required
              >
                <option value="">Chọn giới tính</option>
                <option value="M">Nam</option>
                <option value="F">Nữ</option>
              </select>
              {touched[key] && errors[key] && (
                <div className="invalid-feedback">{errors[key]}</div>
              )}
            </>
          ) : type === "cccd" ? (
            <>
              <input
                className={`form-control ${s.control} ${invalidCls("soCCCD")}`}
                value={f.soCCCD}
                onChange={setNum("soCCCD", 12)}
                onBlur={onBlur("soCCCD")}
                inputMode="numeric"
                pattern="\d*"
                maxLength={12}
                placeholder="12 số"
                required
              />
              {touched.soCCCD && errors.soCCCD && (
                <div className="invalid-feedback">{errors.soCCCD}</div>
              )}
            </>
          ) : type === "phone" ? (
            <>
              <input
                className={`form-control ${s.control} ${invalidCls(key)}`}
                value={f[key]}
                onChange={setNum(key, 10)}
                onBlur={onBlur(key)}
                inputMode="tel"
                pattern="\d*"
                maxLength={10}
                placeholder="10 số"
              />
              {touched[key] && errors[key] && (
                <div className="invalid-feedback">{errors[key]}</div>
              )}
            </>
          ) : (
            <>
              <input
                type={type}
                className={`form-control ${s.control} ${invalidCls(key)}`}
                value={f[key]}
                onChange={set(key)}
                onBlur={onBlur(key)}
              />
              {touched[key] && errors[key] && (
                <div className="invalid-feedback">{errors[key]}</div>
              )}
            </>
          )}
        </div>
      ))}

      <div className="col-12 d-grid">
        <button
          type="submit"
          className={`btn btn-primary btn-lg ${s.bigSubmit}`}
          disabled={submitDisabled}
        >
          {loading ? "Đang lưu..." : "Xác nhận thông tin"}
        </button>
      </div>
    </form>
  );
}
