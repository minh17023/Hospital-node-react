import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import s from "./Step1Patient.module.css";

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // nếu đã là yyyy-MM-dd thì trả nguyên
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Step1Patient() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const cached = localStorage.getItem("PATIENT_INFO");
    if (!cached) { nav("/"); return; }

    const p = JSON.parse(cached);
    setPatient(p);
    setLoading(false);

    // Nếu muốn “tươi” hơn thì mở comment để gọi API me:
    // setLoading(true);
    // client.get("/auth/patient/me").then(r => {
    //   setPatient(r.data?.patient || p);
    // }).finally(() => setLoading(false));
  }, [nav]);

  const edit = () => nav("/register");
  const next = () => nav("/flow-bhyt/step-2"); // TODO: thay route thực tế của bạn

  if (loading) {
    return (
      <div className="container py-4">
        <div className={`${s.card} card p-4 mx-auto`} style={{maxWidth: 1040}}>
          <div className={s.skelTitle} />
          <div className={s.skelRow} />
          <div className={s.skelRow} />
          <div className={s.skelRow} />
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const rowsLeft = [
    ["Số CCCD", patient.soCCCD || "-"],
    ["Họ và tên", patient.hoTen || "-"],
    ["Ngày sinh", fmtDate(patient.ngaySinh)],
    ["Giới tính", patient.gioiTinh === "M" ? "Nam" : patient.gioiTinh === "F" ? "Nữ" : "-"],
    ["Nghề nghiệp", patient.ngheNghiep || "-"],
  ];

  const rowsRight = [
    ["Số điện thoại", patient.soDienThoai || "-"],
    ["Phường/Xã", patient.phuongXa || "-"],
    ["Quận/Huyện", patient.quanHuyen || "-"],
    ["Tỉnh/Thành phố", patient.tinhThanhPho || "-"],
    ["Dân tộc", patient.danToc || "-"],
  ];

  return (
    <div className="container py-4">
      <div className={`${s.card} card p-4 mx-auto`} style={{ maxWidth: 1040 }}>
        <div className="text-center mb-2">
          <h2 className={s.title}>Thông Tin Bệnh Nhân</h2>
          <div className={s.sub}>Xác nhận thông tin của bạn</div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            {rowsLeft.map(([label, value]) => (
              <div key={label} className={s.row}>
                <div className={s.label}>{label}</div>
                <div className={s.value}>{value}</div>
              </div>
            ))}
          </div>

          <div className="col-md-6">
            {rowsRight.map(([label, value]) => (
              <div key={label} className={s.row}>
                <div className={s.label}>{label}</div>
                <div className={s.value}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="d-flex justify-content-center gap-2 mt-4">
          <button className="btn btn-outline-secondary" onClick={edit}>
            Chỉnh sửa
          </button>
          <button className="btn btn-primary px-4" onClick={next}>
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
