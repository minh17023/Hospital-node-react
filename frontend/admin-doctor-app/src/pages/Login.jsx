import { useState } from "react";
import client from "../api/client";
import { setAuth, roleFromVaiTro, ROLES } from "../utils/auth";

const ADMIN_LOGIN_URL = "/auth/admin/login";
const DOCTOR_LOGIN_URL = "/auth/doctor/login";

export default function Login() {
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [mode, setMode] = useState("ADMIN"); // ADMIN | DOCTOR
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    try {
      const url = mode === "ADMIN" ? ADMIN_LOGIN_URL : DOCTOR_LOGIN_URL;
      const { data } = await client.post(url, { tenDangNhap, matKhau });
      setAuth(data);
      const role = roleFromVaiTro(data?.user?.vaiTro);
      window.location.href = role === ROLES.ADMIN ? "/admin" : "/doctor";
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background:
          "radial-gradient(1150px 550px at 10% -10%, #1f2937 0%, #0f172a 45%, #0b1020 100%)",
      }}
    >
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="text-center mb-4">
          <h3 className="fw-semibold m-0" style={{ color: "#e2e8f0" }}>
            Đăng nhập Hệ thống
          </h3>
          
        </div>

        <div
          className="card shadow-lg border-0"
          style={{
            background: "rgba(15,23,42,.6)",
            backdropFilter: "blur(8px)",
            color: "#e5e7eb",
            boxShadow: "0 20px 50px rgba(0,0,0,.45)",
          }}
        >
          <div className="card-body p-4">
            {/* Tabs role */}
            <ul className="nav nav-pills nav-fill mb-3 gap-2">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${
                    mode === "ADMIN" ? "active" : "bg-transparent text-light border"
                  }`}
                  onClick={() => setMode("ADMIN")}
                  style={{
                    borderColor: "rgba(255,255,255,.12)",
                    borderRadius: 12,
                  }}
                >
                  Admin
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${
                    mode === "DOCTOR" ? "active" : "bg-transparent text-light border"
                  }`}
                  onClick={() => setMode("DOCTOR")}
                  style={{
                    borderColor: "rgba(255,255,255,.12)",
                    borderRadius: 12,
                  }}
                >
                  Bác sĩ
                </button>
              </li>
            </ul>

            <form onSubmit={submit} autoComplete="on">
              {/* Username */}
              <label className="form-label small">Tên đăng nhập</label>
              <div className="input-group mb-3">
                <span className="input-group-text bg-transparent border-secondary">
                  {/* user icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 12a5 5 0 100-10 5 5 0 000 10zM3 22a9 9 0 1118 0H3z"
                      stroke="rgba(226,232,240,.9)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  className="form-control border-secondary text-light"
                  style={{ background: "transparent" }}
                  value={tenDangNhap}
                  onChange={(e) => setTenDangNhap(e.target.value)}
                  placeholder="admin / bs.nguyen"
                  autoFocus
                />
              </div>

              {/* Password */}
              <label className="form-label small">Mật khẩu</label>
              <div className="input-group mb-2">
                <span className="input-group-text bg-transparent border-secondary">
                  {/* lock icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 10V8a6 6 0 1112 0v2M6 10h12v10H6V10z"
                      stroke="rgba(226,232,240,.9)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  className="form-control border-secondary text-light"
                  style={{ background: "transparent" }}
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="btn border-secondary"
                  style={{ background: "transparent", color: "#cbd5e1" }}
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {/* eye / eye-off */}
                  {showPwd ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 3l18 18M10.6 10.6A4 4 0 0012 16a4 4 0 003.4-6.4M9.9 5.1A10.9 10.9 0 0112 5c5.5 0 9.5 4.5 10 6.9-.23 1.12-1.25 2.81-3.05 4.24M5.1 7.9C3.62 9.2 2.7 10.7 2 11.9c.5 1.8 3.3 6.1 10 6.1 1.06 0 2.06-.13 3-.39"
                        stroke="rgba(226,232,240,.9)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                        stroke="rgba(226,232,240,.9)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="rgba(226,232,240,.9)"
                        strokeWidth="1.6"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Error */}
              {err && (
                <div
                  className="alert alert-danger py-2 mt-2"
                  style={{ background: "rgba(239,68,68,.12)", borderColor: "#ef4444" }}
                >
                  {err}
                </div>
              )}

              {/* Submit */}
              <button
                className="btn w-100 mt-3"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(20,184,166,.95), rgba(59,130,246,.95))",
                  border: "none",
                  color: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(20,184,166,.35)",
                }}
                disabled={loading}
              >
                {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              </button>

              {/* hint nhỏ */}
              <div className="text-center mt-3 small" style={{ color: "rgba(226,232,240,.6)" }}>
                Nhấn <kbd>Enter</kbd> để đăng nhập nhanh
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-3 small" style={{ color: "rgba(226,232,240,.5)" }}>
          © {new Date().getFullYear()} Bệnh viện 108
        </div>
      </div>
    </div>
  );
}
