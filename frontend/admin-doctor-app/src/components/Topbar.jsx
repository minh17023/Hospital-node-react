import { getMe, clearAuth } from "../utils/auth";

export default function Topbar() {
  const me = getMe() || {};
  const logout = () => { clearAuth(); window.location.href = "/login"; };

  return (
    <nav className="navbar navbar-expand-lg topbar sticky-top">
      <div className="container-fluid">
        {/* Nút mở offcanvas sidebar cho mobile */}
        <button className="btn d-lg-none me-2" type="button"
                data-bs-toggle="offcanvas" data-bs-target="#appSidebar"
                aria-controls="appSidebar">
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Brand */}
        <a className="navbar-brand topbar-brand" href="#">
          Bệnh Viện 108 <span className="dot" />
        </a>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
                data-bs-target="#topbarNav" aria-controls="topbarNav" aria-expanded="false">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="topbarNav">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center">
            {me.role && (
              <li className="nav-item me-3">
                <span className="role-badge">{me.role}</span>
              </li>
            )}
            <li className="nav-item me-2 small text-secondary">
              {me.hoTen || me.tenDangNhap || "Người dùng"}
            </li>
            <li className="nav-item">
              <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
                Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
