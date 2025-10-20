import { useEffect, useMemo, useRef, useState } from "react";
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

  // err = { type: "general" | "username" | "password" | "permission" | "locked", message: string }
  const [err, setErr] = useState(null);
  const alertRef = useRef(null);
  const userRef = useRef(null);
  const passRef = useRef(null);

  // ------ Helpers ------
  const loginUrl = useMemo(
    () => (mode === "ADMIN" ? ADMIN_LOGIN_URL : DOCTOR_LOGIN_URL),
    [mode]
  );

  function prettyError(e) {
    // Ưu tiên thông điệp server
    const raw = e?.response?.data?.message || e?.message || "";
    const status = e?.response?.status;

    // Một số pattern phổ biến phía BE
    const msg = (raw || "").toLowerCase();

    if (status === 429) return { type: "general", message: "Bạn thao tác quá nhanh, thử lại sau ít phút." };
    if (status === 500) return { type: "general", message: "Lỗi máy chủ. Vui lòng thử lại." };
    if (msg.includes("không có quyền") || msg.includes("permission") || msg.includes("forbidden"))
      return { type: "permission", message: "Bạn không có quyền truy cập vai trò này." };
    if (msg.includes("khóa") || msg.includes("locked") || msg.includes("disabled"))
      return { type: "locked", message: "Tài khoản đã bị khóa hoặc vô hiệu hóa." };
    if (msg.includes("mật khẩu") || msg.includes("password"))
      return { type: "password", message: "Mật khẩu không đúng." };
    if (msg.includes("tên đăng nhập") || msg.includes("username") || msg.includes("không tồn tại"))
      return { type: "username", message: "Tên đăng nhập không đúng hoặc không tồn tại." };

    // fallback
    return { type: "general", message: raw || "Đăng nhập thất bại. Vui lòng kiểm tra và thử lại." };
  }

  function clearErrorOnEdit(field) {
    // Khi user sửa trường lỗi thì ẩn lỗi trường đó
    if (!err) return;
    if (field === "username" && (err.type === "username" || err.type === "general")) setErr(null);
    if (field === "password" && (err.type === "password" || err.type === "general")) setErr(null);
  }

  // ====== ADD: gộp thêm trường vào ME trong localStorage ======
  function mergeME(patch) {
    try {
      const cur = JSON.parse(localStorage.getItem("ME") || "null") || {};
      localStorage.setItem("ME", JSON.stringify({ ...cur, ...patch }));
    } catch {}
  }

  // ====== ADD: gọi /doctors/by-user/:maUser để lấy maBacSi ======
  async function hydrateDoctor(maUser) {
    if (!maUser) return;
    try {
      const { data } = await client.get(`/doctors/by-user/${maUser}`);
      const maBacSi = data?.doctor?.maBacSi ?? data?.maBacSi ?? null;
      if (maBacSi) mergeME({ maBacSi });
    } catch {
      // không chặn luồng login nếu API phụ này lỗi
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validate đơn giản phía FE
    if (!tenDangNhap?.trim()) {
      setErr({ type: "username", message: "Vui lòng nhập tên đăng nhập." });
      userRef.current?.focus();
      return;
    }
    if (!matKhau) {
      setErr({ type: "password", message: "Vui lòng nhập mật khẩu." });
      passRef.current?.focus();
      return;
    }

    setErr(null);
    setLoading(true);
    try {
      const { data } = await client.post(loginUrl, { tenDangNhap, matKhau });
      setAuth(data);

      const role = roleFromVaiTro(data?.user?.vaiTro);
      // Chặn bác sĩ đăng nhập nhầm tab Admin
      if (mode === "ADMIN" && role !== ROLES.ADMIN) {
        setErr({ type: "permission", message: "Không có quyền ADMIN hoặc tài khoản không hợp lệ." });
        return;
      }
      if (mode === "DOCTOR" && role !== ROLES.DOCTOR) {
        setErr({ type: "permission", message: "Không đúng vai trò Bác sĩ cho tài khoản này." });
        return;
      }

      // ====== ADD: nếu là bác sĩ → lấy maBacSi theo maUser và lưu vào ME ======
      if (role === ROLES.DOCTOR) {
        const maUser =
          data?.user?.maUser ||
          data?.user?.maNguoiDung ||
          data?.user?.id ||
          data?.user?.ma; // dự phòng các key khác nhau
        await hydrateDoctor(maUser);
      }

      window.location.href = role === ROLES.ADMIN ? "/admin" : "/doctor";
    } catch (e2) {
      const pe = prettyError(e2);
      setErr(pe);
      // đưa focus vào banner để SR đọc, sau đó focus vào input phù hợp
      setTimeout(() => {
        alertRef.current?.focus();
        if (pe?.type === "username") userRef.current?.focus();
        if (pe?.type === "password") passRef.current?.focus();
      }, 0);
    } finally {
      setLoading(false);
    }
  };

  // Tự ẩn banner lỗi sau 6s (không bắt buộc)
  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(null), 6000);
    return () => clearTimeout(t);
  }, [err]);

  // CSS nhỏ cho banner và viền lỗi
  const invalidUser = err?.type === "username";
  const invalidPass = err?.type === "password";
  const bannerColor =
    err?.type === "permission" || err?.type === "locked" ? "#f59e0b" : "#ef4444"; // vàng cho quyền/khóa, đỏ cho còn lại

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background:
          "radial-gradient(1150px 550px at 10% -10%, #1f2937 0%, #0f172a 45%, #0b1020 100%)",
      }}
    >
      <div className="container" style={{ maxWidth: 480 }}>
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
                  className={`nav-link ${mode === "ADMIN" ? "active" : "bg-transparent text-light border"}`}
                  onClick={() => setMode("ADMIN")}
                  style={{ borderColor: "rgba(255,255,255,.12)", borderRadius: 12 }}
                >
                  Admin
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${mode === "DOCTOR" ? "active" : "bg-transparent text-light border"}`}
                  onClick={() => setMode("DOCTOR")}
                  style={{ borderColor: "rgba(255,255,255,.12)", borderRadius: 12 }}
                >
                  Bác sĩ
                </button>
              </li>
            </ul>

            {/* Error banner */}
            {err && (
              <div
                ref={alertRef}
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                className="rounded-3 px-3 py-2 mb-3 d-flex align-items-start"
                style={{
                  background: bannerColor === "#ef4444" ? "rgba(239,68,68,.14)" : "rgba(245,158,11,.14)",
                  border: `1px solid ${bannerColor}`,
                  color: "#fde68a",
                }}
              >
                {/* Icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="me-2 mt-1"
                >
                  <path
                    d="M12 9v5m0 4h.01M10.29 3.86l-8.18 14.2A2 2 0 004 21h16a2 2 0 001.74-2.94l-8.18-14.2a2 2 0 00-3.48 0z"
                    stroke={bannerColor}
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex-grow-1" style={{ color: "#fde68a" }}>
                  <strong style={{ color: bannerColor === "#ef4444" ? "#fecaca" : "#fde68a" }}>
                    {err.type === "permission"
                      ? "Không có quyền"
                      : err.type === "locked"
                      ? "Tài khoản bị khóa"
                      : "Không thể đăng nhập"}
                    :
                  </strong>{" "}
                  {err.message}
                </div>
                <button
                  type="button"
                  className="btn btn-sm ms-2"
                  style={{ color: "#e5e7eb" }}
                  aria-label="Đóng"
                  onClick={() => setErr(null)}
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={submit} autoComplete="on" noValidate>
              {/* Username */}
              <label className="form-label small">Tên đăng nhập</label>
              <div className="input-group mb-3">
                <span className={`input-group-text bg-transparent ${invalidUser ? "border-danger" : "border-secondary"}`}>
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
                  ref={userRef}
                  className={`form-control text-light ${invalidUser ? "is-invalid border-danger" : "border-secondary"}`}
                  style={{ background: "transparent" }}
                  value={tenDangNhap}
                  onChange={(e) => {
                    setTenDangNhap(e.target.value);
                    clearErrorOnEdit("username");
                  }}
                  placeholder="admin / bs.nguyen"
                  autoFocus
                />
              </div>

              {/* Password */}
              <label className="form-label small">Mật khẩu</label>
              <div className="input-group mb-1">
                <span className={`input-group-text bg-transparent ${invalidPass ? "border-danger" : "border-secondary"}`}>
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
                  ref={passRef}
                  type={showPwd ? "text" : "password"}
                  className={`form-control text-light ${invalidPass ? "is-invalid border-danger" : "border-secondary"}`}
                  style={{ background: "transparent" }}
                  value={matKhau}
                  onChange={(e) => {
                    setMatKhau(e.target.value);
                    clearErrorOnEdit("password");
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className={`btn ${invalidPass ? "border-danger" : "border-secondary"}`}
                  style={{ background: "transparent", color: "#cbd5e1" }}
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
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
                      <circle cx="12" cy="12" r="3" stroke="rgba(226,232,240,.9)" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
              </div>
              {invalidUser && (
                <div className="invalid-feedback d-block mb-2">Vui lòng kiểm tra lại tên đăng nhập.</div>
              )}
              {invalidPass && (
                <div className="invalid-feedback d-block mb-2">Mật khẩu chưa đúng.</div>
              )}

              {/* Submit */}
              <button
                className="btn w-100 mt-3"
                style={{
                  background: "linear-gradient(135deg, rgba(20,184,166,.95), rgba(59,130,246,.95))",
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
