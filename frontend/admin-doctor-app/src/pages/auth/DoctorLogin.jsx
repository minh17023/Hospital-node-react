import { useState } from "react";
import { doctorLogin } from "../../api/auth";
import { saveAuth, getRole } from "../../utils/auth";
import "./login.css";

export default function DoctorLogin() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const data = await doctorLogin({ username, password });
      if (data?.user?.role?.toUpperCase() !== "DOCTOR") throw new Error("Sai phân quyền");
      saveAuth(data);
      if (getRole() !== "DOCTOR") throw new Error("Sai phân quyền");
      window.location.href = "/doctor";
    } catch (e) {
      setErr(e.message || "Đăng nhập thất bại");
    } finally { setLoading(false); }
  }

  return (
    <div className="wrap">
      <form className="card" onSubmit={onSubmit}>
        <h2>Đăng nhập Doctor</h2>
        <div className="form">
          <input placeholder="Tài khoản" value={username} onChange={e=>setU(e.target.value)} autoFocus />
          <input type="password" placeholder="Mật khẩu" value={password} onChange={e=>setP(e.target.value)} />
          {err && <div className="err">{err}</div>}
          <button className="btn" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>
        <div className="hint">Bạn là admin? <a href="/login/admin">Đăng nhập Admin</a></div>
      </form>
    </div>
  );
}
