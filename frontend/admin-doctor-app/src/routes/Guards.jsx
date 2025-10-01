import { Navigate, Outlet } from "react-router-dom";
import { getToken, getRole } from "../utils/auth";

/** Bảo vệ: phải có token */
export function RequireAuth() {
  if (!getToken()) return <Navigate to="/login/doctor" replace />;
  return <Outlet />;
}

/** Bảo vệ theo role */
export function RequireRole({ allow = [] }) {
  const r = getRole();
  if (!allow.includes(r)) return <Navigate to="/login/doctor" replace />;
  return <Outlet />;
}
