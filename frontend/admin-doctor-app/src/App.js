import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { RequireAuth, RequireRole } from "./routes/Guards";

import AdminLogin from "./pages/auth/AdminLogin";
import DoctorLogin from "./pages/auth/DoctorLogin";

import AdminLayout from "./components/admin/AdminLayout";
import DoctorLayout from "./components/doctor/DoctorLayout";

import AdminDashboard from "./pages/admin/Dashboard";
import DoctorDashboard from "./pages/doctor/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* mặc định đưa về login doctor */}
        <Route path="/" element={<Navigate to="/login/doctor" replace />} />

        {/* login */}
        <Route path="/login/admin"  element={<AdminLogin />} />
        <Route path="/login/doctor" element={<DoctorLogin />} />

        {/* Khu vực cần đăng nhập */}
        <Route element={<RequireAuth />}>
          {/* Admin */}
          <Route element={<RequireRole allow={["ADMIN"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              {/* thêm route con cho admin tại đây */}
            </Route>
          </Route>

          {/* Doctor */}
          <Route element={<RequireRole allow={["DOCTOR"]} />}>
            <Route element={<DoctorLayout />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              {/* thêm route con cho doctor tại đây */}
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<div style={{ padding: 16 }}>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}
