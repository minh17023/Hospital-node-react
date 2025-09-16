import { useEffect, useState } from "react";
import client from "../api/client";
import Stepper from "../components/Stepper";
import CccdPad from "../components/CccdPad";
import PatientForm from "../components/PatientForm";
import Summary from "../components/Summary";

export default function BhyTFlow() {
  const [step, setStep] = useState(1);
  const [cccd, setCccd] = useState("");
  const [showPad, setShowPad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null); // nếu login thành công
  const [justCreated, setJustCreated] = useState(false);

  // b1: nhập cccd → gọi login
  const handleSubmitCCCD = async (value) => {
    setShowPad(false);
    if (!value || value.length !== 12) return alert("Vui lòng nhập đủ 12 số CCCD");
    setCccd(value);
    setLoading(true);
    try {
      const { data } = await client.post("/auth/patient/login", { cccd: value });
      localStorage.setItem("PATIENT_TOKEN", data.accessToken);
      setPatient(data.patient);
      setStep(2); // đã có hồ sơ → qua chọn dịch vụ
    } catch (e) {
      if (e?.response?.status === 404) {
        // chưa có hồ sơ → hiển thị form đăng ký
        setPatient(null);
      } else {
        alert("Lỗi đăng nhập");
      }
    } finally {
      setLoading(false);
    }
  };

  // b1 form đăng ký (chỉ khi patient = null)
  const handleRegister = async (payload) => {
    setLoading(true);
    try {
      const { data } = await client.post("/auth/patient/register", payload);
      localStorage.setItem("PATIENT_TOKEN", data.accessToken);
      setPatient(data.patient);
      setJustCreated(true);
      setStep(2);
    } catch (e) {
      alert(e?.response?.data?.message || "Không thể đăng ký");
    } finally {
      setLoading(false);
    }
  };

  // b2: chọn dịch vụ (demo)
  const goPrint = () => setStep(3);

  return (
    <div className="container">
      <div className="topbar">
        <button className="back" onClick={() => window.history.back()}>&larr; Quay lại</button>
        <h2>Đăng Ký Khám Bệnh BHYT</h2>
      </div>

      <Stepper step={step} />

      {step === 1 && (
        <div className="card">
          <h2 className="center">Nhập Số CCCD</h2>
          <p className="center">Vui lòng nhập số căn cước công dân (12 số)</p>
          <div className="cccd-box">
            <input
              placeholder="Nhấn để nhập CCCD"
              value={cccd}
              onChange={(e) => setCccd(e.target.value.replace(/\D/g, "").slice(0, 12))}
              onFocus={() => setShowPad(true)}
            />
            <button className="btn" onClick={() => setShowPad(true)}>📷</button>
          </div>
          <button className="btn primary" disabled={loading} onClick={() => handleSubmitCCCD(cccd)}>
            Xác nhận
          </button>

          {/* nếu chưa có hồ sơ -> show form ngay dưới (cho giống demo của bạn) */}
          {!patient && cccd && (
            <>
              <h3 className="sep">Chưa có hồ sơ? Điền thông tin để đăng ký</h3>
              <PatientForm cccd={cccd} loading={loading} onSubmit={handleRegister} />
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Xin chào, {patient?.hoTen}</h2>
          {justCreated && <div className="alert success">Đã tạo hồ sơ bệnh nhân thành công.</div>}
          <p>Chọn dịch vụ bạn muốn sử dụng:</p>
          <div className="grid2">
            <button className="select-card" onClick={goPrint}>
              <div className="ic">💙</div>
              <div><div className="title">Khám BHYT</div><div className="sub">Sử dụng thẻ BHYT</div></div>
              <div className="chev">›</div>
            </button>
            <button className="select-card" onClick={goPrint}>
              <div className="ic">🟩</div>
              <div><div className="title">Khám dịch vụ</div><div className="sub">Không dùng BHYT</div></div>
              <div className="chev">›</div>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Summary
          patient={patient}
          onPrint={() => window.print()}
          onDone={() => window.location.assign("/")}
        />
      )}

      {showPad && (
        <CccdPad
          value={cccd}
          onClose={() => setShowPad(false)}
          onSubmit={handleSubmitCCCD}
        />
      )}
    </div>
  );
}
