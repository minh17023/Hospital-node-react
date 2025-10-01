import { useState } from "react";
import { adminLogin } from "../../api/auth";
import { saveAuth, getRole } from "../../utils/auth";
import "./login.css";

export default function AdminLogin() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const data = await adminLogin({ username, password });
      saveAuth(serverData); // normalize & lưu
    if (getRole() !== "ADMIN") {
    // nếu BE map vaiTro != 1 thì đây sẽ chặn
    }
      window.location.href = "/admin";
    } catch (e) {
      setErr(e.message || "Đăng nhập thất bại");
    } finally { setLoading(false); }
  }

  return (
    <div className="wrap">
      <form className="card" onSubmit={onSubmit}>
        <h2>Đăng nhập Admin</h2>
        <div className="form">
          <input placeholder="Tài khoản" value={username} onChange={e=>setU(e.target.value)} autoFocus />
          <input type="password" placeholder="Mật khẩu" value={password} onChange={e=>setP(e.target.value)} />
          {err && <div className="err">{err}</div>}
          <button className="btn" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>
        <div className="hint">Bạn là bác sĩ? <a href="/login/doctor">Đăng nhập Doctor</a></div>
      </form>
    </div>
  );
}
