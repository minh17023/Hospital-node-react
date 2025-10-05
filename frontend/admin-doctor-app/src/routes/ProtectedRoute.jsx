import { Navigate } from "react-router-dom";
import { getMe, hasRole } from "../utils/auth";

export default function ProtectedRoute({ children, roles=null }) {
  const me = getMe();
  if (!me) return <Navigate to="/login" replace />;

  if (roles && !hasRole(...roles)) {
    // Không đủ quyền -> đẩy về trang home tương ứng
    return <Navigate to={me.role === "ADMIN" ? "/admin" : "/doctor"} replace />;
  }
  return children;
}
