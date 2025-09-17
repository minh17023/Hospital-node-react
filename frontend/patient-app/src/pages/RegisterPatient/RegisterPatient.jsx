import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import PatientForm from "../../components/PatientForm/PatientForm";

export default function RegisterPatient() {
  const nav = useNavigate();
  const { search } = useLocation();
  const [loading, setLoading] = useState(false);
  const [cccd, setCccd] = useState("");

  useEffect(() => {
    const byQuery = new URLSearchParams(search).get("cccd"); // /register?cccd=123...
    const byLocal = localStorage.getItem("PENDING_CCCD");
    const v = (byQuery || byLocal || "").replace(/\D/g, "").slice(0, 12);
    if (!v) { nav("/"); return; }
    setCccd(v);
  }, [nav, search]);

  const submit = async (payload) => {
    setLoading(true);
    try {
      // đảm bảo server nhận đúng soCCCD
      const body = { ...payload, soCCCD: payload.soCCCD || cccd, nguoiTao: payload.nguoiTao || "kiosk" };
      const { data } = await client.post("/auth/patient/register", body);
      localStorage.setItem("PATIENT_TOKEN", data.accessToken);
      localStorage.setItem("PATIENT_INFO", JSON.stringify(data.patient));
      nav("/register-bhyt");
    } catch (e) {
      alert(e?.response?.data?.message || "Không thể đăng ký");
    } finally { setLoading(false); }
  };

  return (
    <div className="container py-4">
      <div className="card p-4 mx-auto" style={{ maxWidth: 960 }}>
        <h3 className="mb-3 text-center">Đăng ký hồ sơ bệnh nhân</h3>
        <PatientForm cccd={cccd} loading={loading} onSubmit={submit} />
      </div>
    </div>
  );
}
