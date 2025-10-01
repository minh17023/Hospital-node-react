import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet, NavLink } from "react-router-dom";
import { getAuth, logout } from "../../utils/auth";

export default function AdminLayout() {
  const user = getAuth()?.user;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <div>
        <Topbar title="Admin Console" user={user} onLogout={logout} />
        <div style={{ padding: 16 }}>
          <nav style={{ marginBottom: 12 }}>
            <NavLink to="/admin" end>Dashboard</NavLink>
            {"  |  "}
            <NavLink to="/admin/users">Users</NavLink>
          </nav>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
