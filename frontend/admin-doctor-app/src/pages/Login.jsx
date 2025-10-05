import { useState } from "react";
import client from "../api/client";
import { setAuth, roleFromVaiTro, ROLES } from "../utils/auth";

const ADMIN_LOGIN_URL = "/auth/admin/login";
const DOCTOR_LOGIN_URL = "/auth/doctor/login";

export default function Login() {
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [mode, setMode] = useState("ADMIN");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const url = mode === "ADMIN" ? ADMIN_LOGIN_URL : DOCTOR_LOGIN_URL;
      const { data } = await client.post(url, { tenDangNhap, matKhau });
      setAuth(data);
      const role = roleFromVaiTro(data?.user?.vaiTro);
      window.location.href = role === ROLES.ADMIN ? "/admin" : "/doctor";
    } catch (e) {
      setErr(e?.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-8 col-md-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="card-title mb-3">Đăng nhập</h4>

              <div className="btn-group mb-3">
                <button type="button"
                        className={`btn btn-sm ${mode==="ADMIN" ? "btn-primary":"btn-outline-primary"}`}
                        onClick={()=>setMode("ADMIN")}>Admin</button>
                <button type="button"
                        className={`btn btn-sm ${mode==="DOCTOR" ? "btn-primary":"btn-outline-primary"}`}
                        onClick={()=>setMode("DOCTOR")}>Doctor</button>
              </div>

              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">Tên đăng nhập</label>
                  <input className="form-control" value={tenDangNhap}
                         onChange={e=>setTenDangNhap(e.target.value)} autoFocus />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mật khẩu</label>
                  <input type="password" className="form-control" value={matKhau}
                         onChange={e=>setMatKhau(e.target.value)} />
                </div>
                {err && <div className="alert alert-danger py-2">{err}</div>}
                <button className="btn btn-primary w-100" disabled={loading}>
                  {loading ? "Đang đăng nhập…" : "Đăng nhập"}
                </button>
                {mode === "DOCTOR" && (
                <div className="text-center mt-3">
                    <a href="/register-doctor">Chưa có tài khoản? Đăng ký bác sĩ</a>
                </div>
                )}
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
