// src/pages/MenuPage/MenuPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import s from "./MenuPage.module.css";

// Helpers đọc thông tin phiên
const getPatient = () => {
  const raw = sessionStorage.getItem("PATIENT_INFO") || localStorage.getItem("PATIENT_INFO");
  return raw ? JSON.parse(raw) : null;
};
const hasValidBhyt = () => sessionStorage.getItem("HAS_VALID_BHYT") === "1";
const skippedBhyt = () => sessionStorage.getItem("SKIP_BHYT") === "1";
const pickModeFromSession = () => (hasValidBhyt() && !skippedBhyt() ? "bhyt" : "service");

export default function MenuPage() {
  const nav = useNavigate();
  const [patient, setPatient] = useState(null);
  const [checking, setChecking] = useState(true);

  // 1) Lấy patient từ storage
  useEffect(() => {
    const p = getPatient();
    if (!p) { nav("/"); return; }
    setPatient(p);
  }, [nav]);

  // 2) Gọi API check BHYT, lưu vào sessionStorage (không TTL)
  useEffect(() => {
    if (!patient) return;
    setChecking(true);
    client
      .get(`/patients/${patient.idBenhNhan}/insurance/has-valid`)
      .then(({ data }) => {
        const ok = !!data?.hasValid;
        sessionStorage.setItem("HAS_VALID_BHYT", ok ? "1" : "0");
        if (ok && data.currentCard) {
          sessionStorage.setItem("CURRENT_BHYT", JSON.stringify(data.currentCard));
        } else {
          sessionStorage.removeItem("CURRENT_BHYT");
        }
      })
      .catch(() => {
        sessionStorage.setItem("HAS_VALID_BHYT", "0");
        sessionStorage.removeItem("CURRENT_BHYT");
      })
      .finally(() => setChecking(false));
  }, [patient]);

  // 3) Điều hướng – cả 2 nút đều chọn mode dựa trên session
  const goStep1 = () => {
    const mode = pickModeFromSession();
    nav(`/flow/step-1?mode=${mode}`);
  };

  if (!patient) return null;

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold">Hệ Thống Đăng Ký Khám Bệnh</h2>
        <p className="text-muted m-0">Chọn loại dịch vụ bạn muốn sử dụng</p>
      </div>

      <div className={s.grid}>
        {/* Khám BHYT (nhưng vẫn pick mode theo session) */}
        <button type="button" className={s.tile} onClick={goStep1} disabled={checking}>
          <div className={s.icon} style={{ background: "#2f6df1", color: "#fff" }}>♥</div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Khám Bảo Hiểm Y Tế</div>
            <div className="text-muted">
              {checking
                ? "Đang kiểm tra thẻ..."
                : (hasValidBhyt() && !skippedBhyt() ? "Sử dụng thẻ BHYT" : "Không đủ điều kiện BHYT → khám dịch vụ")}
            </div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>

        {/* Khám Dịch Vụ (yêu cầu của bạn: cũng check session; 1 → bhyt, 0 → service) */}
        <button type="button" className={s.tile} onClick={goStep1}>
          <div className={s.icon} style={{ background: "#10b981", color: "#fff" }}>▣</div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Khám Dịch Vụ</div>
            <div className="text-muted">
              {(hasValidBhyt() && !skippedBhyt()) ? "Có thẻ BHYT → dùng BHYT" : "Không dùng BHYT"}
            </div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>

        <button type="button" className={s.tile} onClick={() => nav("/appointments")}>
          <div className={s.icon} style={{ background: "#8b5cf6", color: "#fff" }}>🕒</div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Đặt Lịch Hẹn</div>
            <div className="text-muted">Đăng ký khám theo thời gian</div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>

        <button type="button" className={s.tile} onClick={() => nav("/results")}>
          <div className={s.icon} style={{ background: "#f59e0b", color: "#fff" }}>🧾</div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Tra Cứu Kết Quả</div>
            <div className="text-muted">Xem kết quả khám bệnh</div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>
      </div>

      <div className="text-center text-muted mt-4">Phiên bản: v1.0.0</div>
    </div>
  );
}
