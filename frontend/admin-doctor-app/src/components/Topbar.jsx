import { getMe, clearAuth } from "../utils/auth";

export default function Topbar() {
  const me = getMe() || {};
  const logout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <nav className="navbar navbar-expand-lg topbar sticky-top">
      <div className="container-fluid px-3">
        {/* Hamburger (mobile) */}
        <button
          className="btn topbar-toggle d-lg-none me-2"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#appSidebar"
          aria-controls="appSidebar"
          aria-label="Mở menu"
        >
          <span className="hamburger">
            <span />
            <span />
            <span />
          </span>
        </button>

        {/* Brand */}
        <a className="navbar-brand topbar-brand d-flex align-items-center" href="#">
          <span className="brand-dot me-2" />
          <span>Bệnh Viện 108</span>
        </a>

        {/* Collapse (right) */}
        <button
          className="navbar-toggler topbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#topbarNav"
          aria-controls="topbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="topbarNav">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-2">
            {me.role && (
              <li className="nav-item">
                <span className="role-badge">{me.role}</span>
              </li>
            )}
            <li className="nav-item small text-secondary me-1">
              {me.hoTen || me.tenDangNhap || "Người dùng"}
            </li>
            <li className="nav-item">
              <button className="btn topbar-btn" onClick={logout}>
                Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
