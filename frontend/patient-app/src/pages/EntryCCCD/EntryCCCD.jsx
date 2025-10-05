import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import CccdPad from "../../components/CccdPad/CccdPad";
import s from "./EntryCCCD.module.css";

export default function EntryCCCD() {
  const [soCCCD, setCccd] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (val) => {
    const cccd = String(val || "").replace(/\D/g, "");
    if (cccd.length !== 12) return alert("Nhập đủ 12 số CCCD");

    setLoading(true);
    try {
      const { data } = await client.post("/auth/patient/login", { soCCCD: cccd });

      localStorage.setItem("PATIENT_TOKEN", data.accessToken);
      localStorage.setItem("PATIENT_INFO", JSON.stringify(data.patient));
      nav("/menu");
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        // Lưu CCCD để auto-fill form đăng ký
        localStorage.setItem("PENDING_CCCD", cccd);

        // Thông báo + hỏi người dùng có muốn đăng ký ngay không
        const ok = window.confirm(
          "Không tìm thấy hồ sơ bệnh nhân với CCCD này.\nBạn có muốn đăng ký hồ sơ mới ngay bây giờ không?"
        );
        if (ok) {
          nav("/register");
        } else {
          // Giữ keypad mở để người dùng nhập lại/sửa
          setShow(true);
        }
      } else {
        alert(e?.response?.data?.message || "Lỗi đăng nhập");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold">Đăng Ký Khám Bệnh BHYT</h2>
        <p className="text-muted m-0">Vui lòng nhập số căn cước công dân (12 số)</p>
      </div>

      <div className={`card p-4 mx-auto ${s.block}`}>
        <div className="input-group input-group-lg mb-3">
          <input
            className={`form-control text-center ${s.inputBig}`}
            placeholder="Nhấn để nhập CCCD"
            value={soCCCD}
            onFocus={() => setShow(true)}
            onChange={(e) => setCccd(e.target.value.replace(/\D/g, "").slice(0, 12))}
          />
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => setShow(true)}
            title="Nhập CCCD bằng bàn phím màn hình / quét"
          >
            📷
          </button>
        </div>

        <div className="d-grid">
          <button
            className="btn btn-primary btn-lg"
            disabled={loading}
            onClick={() => submit(soCCCD)}
          >
            {loading ? "Đang xác thực..." : "Xác nhận"}
          </button>
        </div>
      </div>

      {show && (
        <CccdPad value={soCCCD} onClose={() => setShow(false)} onSubmit={submit} />
      )}
    </div>
  );
}
