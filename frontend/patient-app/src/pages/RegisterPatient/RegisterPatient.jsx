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
      const soCCCD =
        (payload?.soCCCD || cccd || "").toString().replace(/\D/g, "").slice(0, 12);

      const body = {
        ...payload,
        soCCCD,
        nguoiTao: (payload?.nguoiTao || "kiosk").toString().slice(0, 50),
      };

      const { data } = await client.post("/auth/patient/register", body);

      // Đảm bảo response hợp lệ theo API mới
      if (!data?.accessToken || !data?.patient) {
        throw new Error("RESP_INVALID");
      }

      // Lưu phiên đăng nhập bệnh nhân
      localStorage.setItem("PATIENT_TOKEN", data.accessToken);
      localStorage.setItem("PATIENT_INFO", JSON.stringify(data.patient));
      // Không cần giữ CCCD tạm nữa
      localStorage.removeItem("PENDING_CCCD");

      // Sang bước đăng ký BHYT
      nav("/register-bhyt");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.message === "RESP_INVALID" ? "Phản hồi không hợp lệ" : null) ||
        "Không thể đăng ký";
      alert(msg);
    } finally {
      setLoading(false);
    }
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
