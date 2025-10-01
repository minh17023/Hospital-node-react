import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import s from "./MenuPage.module.css";

const getPatient = () => {
  const raw =
    sessionStorage.getItem("PATIENT_INFO") ||
    localStorage.getItem("PATIENT_INFO");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function MenuPage() {
  const nav = useNavigate();
  const [patient, setPatient] = useState(null);
  const [checking, setChecking] = useState(true);
  const [hasValid, setHasValid] = useState(
    sessionStorage.getItem("HAS_VALID_BHYT") === "1"
  );

  useEffect(() => {
    const p = getPatient();
    if (!p) {
      nav("/");
      return;
    }
    setPatient(p);
  }, [nav]);

  useEffect(() => {
    if (!patient?.idBenhNhan) return;
    let mounted = true;
    setChecking(true);

    client
      .get(`/patients/${patient.idBenhNhan}/insurance/has-valid`)
      .then(({ data }) => {
        const ok = !!data?.hasValid;
        sessionStorage.setItem("HAS_VALID_BHYT", ok ? "1" : "0");
        if (ok && data?.currentCard)
          sessionStorage.setItem(
            "CURRENT_BHYT",
            JSON.stringify(data.currentCard)
          );
        else sessionStorage.removeItem("CURRENT_BHYT");
        if (mounted) setHasValid(ok);
      })
      .catch(() => {
        sessionStorage.setItem("HAS_VALID_BHYT", "0");
        sessionStorage.removeItem("CURRENT_BHYT");
        if (mounted) setHasValid(false);
      })
      .finally(() => mounted && setChecking(false));

    return () => {
      mounted = false;
    };
  }, [patient?.idBenhNhan]);

  const goBhyt = () => {
    if (checking) {
      alert("Đang kiểm tra thẻ BHYT, vui lòng đợi...");
      return;
    }

    // đọc cờ từ state hoặc storage (phòng khi state chưa kịp đồng bộ)
    const has =
      hasValid || sessionStorage.getItem("HAS_VALID_BHYT") === "1";

    if (has) {
      // Có BHYT hợp lệ -> vào flow BHYT
      nav("/flow/bhyt/step-1");
    } else {
      // Không hợp lệ -> thông báo và chuyển sang dịch vụ thường
      alert(
        "Tài khoản hiện không có thẻ BHYT hợp lệ. Hệ thống sẽ chuyển sang Khám Dịch Vụ."
      );
      nav("/flow/service/step-1");
    }
  };

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold">Hệ Thống Đăng Ký Khám Bệnh</h2>
        <p className="text-muted m-0">Chọn loại dịch vụ bạn muốn sử dụng</p>
      </div>

      <div className={s.grid}>
        <button type="button" className={s.tile} onClick={goBhyt}>
          <div className={s.icon} style={{ background: "#2f6df1", color: "#fff" }}>
            ♥
          </div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Khám Bảo Hiểm Y Tế</div>
            <div className="text-muted">
              {checking
                ? "Đang kiểm tra thẻ..."
                : hasValid
                ? "Sử dụng thẻ BHYT"
                : "Không đủ điều kiện BHYT"}
            </div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>

        <button
          type="button"
          className={s.tile}
          onClick={() => nav("/flow/service/step-1")}
        >
          <div className={s.icon} style={{ background: "#10b981", color: "#fff" }}>
            ▣
          </div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Khám Dịch Vụ</div>
            <div className="text-muted">Không dùng BHYT</div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>

        <button
          type="button"
          className={s.tile}
          onClick={() => nav("/flow/booking/step-1")}
        >
          <div className={s.icon} style={{ background: "#8b5cf6", color: "#fff" }}>
            🕒
          </div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Đặt Lịch Hẹn</div>
            <div className="text-muted">Đăng ký khám theo thời gian</div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>

        <button type="button" className={s.tile} onClick={() => nav("/search")}>
          <div className={s.icon} style={{ background: "#f59e0b", color: "#fff" }}>
            🧾
          </div>
          <div className="flex-grow-1 text-start">
            <div className="fw-bold fs-5">Tra Cứu Kết Quả</div>
            <div className="text-muted">Xem kết quả khám bệnh</div>
          </div>
          <div className="fs-3 text-muted">›</div>
        </button>
      </div>
    </div>
  );
}
