import { NavLink } from "react-router-dom";
import { getMe, ROLES } from "../utils/auth";

// Convert số <-> chuỗi để hiển thị đẹp
const roleName = (r) => {
  if (r === ROLES.ADMIN || r === "ADMIN") return "ADMIN";
  if (r === ROLES.DOCTOR || r === "DOCTOR") return "DOCTOR";
  if (r === ROLES.PATIENT || r === "PATIENT") return "PATIENT";
  return "DOCTOR";
};

function MenuList({ role }) {
  const adminMenu = [
    { to: "/admin",                label: "Tổng quan" },
    { to: "/admin/appointments",   label: "Lịch hẹn" },
    { to: "/admin/schedules",      label: "Lịch làm việc" },
    { to: "/admin/doctors",        label: "Bác sĩ" },
    { to: "/admin/patients",       label: "Bệnh nhân" },
    { to: "/admin/specialties",    label: "Chuyên khoa" },   
    { to: "/admin/clinics",        label: "Phòng khám" },   
    { to: "/admin/shifts",         label: "Ca làm việc" },   
    { to: "/admin/payments",       label: "Thanh toán" },
    { to: "/admin/users",          label: "Người dùng" },
  ];

  const doctorMenu = [
    { to: "/doctor",                label: "Bảng điều khiển" },
    { to: "/doctor/my-appointments",label: "Lịch hẹn của tôi" },
    { to: "/doctor/my-schedule",    label: "Ca làm việc của tôi" },
    { to: "/doctor/patients",       label: "Bệnh nhân (xem)" },
    { to: "/doctor/profile",        label: "Hồ sơ" },
  ];

  const menus = (role === ROLES.ADMIN || role === "ADMIN") ? adminMenu : doctorMenu;

  return (
    <ul className="nav nav-pills flex-column mb-auto px-2">
      {menus.map(m => (
        <li className="nav-item" key={m.to}>
          <NavLink
            to={m.to}
            end
            className={({isActive}) => `nav-link ${isActive ? "active" : "text-light"}`}
          >
            {m.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar() {
  const me = getMe() || {};
  const role = roleName(me.role);

  return (
    <>
      {/* Desktop */}
      <div className="d-none d-lg-flex flex-column sidebar">
        <div className="section">
          <div className="caption">Vai trò</div>
          <div className="fw-semibold">{role}</div>
        </div>
        <MenuList role={role}/>
        <div className="foot text-center">v1.0</div>
      </div>

      {/* Mobile: Offcanvas */}
      <div className="offcanvas offcanvas-start sidebar d-lg-none" tabIndex="-1" id="appSidebar"
           aria-labelledby="appSidebarLabel">
        <div className="section d-flex justify-content-between align-items-center">
          <div>
            <div className="caption">Vai trò</div>
            <div className="fw-semibold">{role}</div>
          </div>
          <button type="button" className="btn btn-sm btn-light" data-bs-dismiss="offcanvas" aria-label="Đóng">
            Đóng
          </button>
        </div>
        <MenuList role={role}/>
        <div className="foot text-center">v1.0</div>
      </div>
    </>
  );
}
