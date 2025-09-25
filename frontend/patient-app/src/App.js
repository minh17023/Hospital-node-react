import { Routes, Route, Navigate } from "react-router-dom";
import PageShell from "./components/PageShell/PageShell";

// Pages
import EntryCCCD from "./pages/EntryCCCD/EntryCCCD";
import MenuPage from "./pages/MenuPage/MenuPage";
import RegisterPatient from "./pages/RegisterPatient/RegisterPatient";
import RegisterBHYT from "./pages/RegisterBHYT/RegisterBHYT";
import ProfilePage from "./pages/Profile/ProfilePage";

// Flow 3-step chung
import PatientStep from "./pages/Flow/steps/PatientStep";
import ServiceStep from "./pages/Flow/steps/ServiceStep";
import AppointmentStep from "./pages/Flow/steps/AppointmentStep";

// guard
const getPatient = () => {
  const raw = localStorage.getItem("PATIENT_INFO") || sessionStorage.getItem("PATIENT_INFO");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const getToken = () =>
  localStorage.getItem("PATIENT_TOKEN") || sessionStorage.getItem("PATIENT_TOKEN");
function RequirePatient({ children }) {
  const ok = !!(getPatient() && getToken());
  return ok ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PageShell title="Đăng Ký Khám Bệnh BHYT">
            <EntryCCCD />
          </PageShell>
        }
      />

      <Route
        path="/menu"
        element={
          <PageShell title="Hệ Thống Đăng Ký Khám Bệnh">
            <RequirePatient><MenuPage /></RequirePatient>
          </PageShell>
        }
      />

      <Route
        path="/register"
        element={
          <PageShell title="Thông Tin Bệnh Nhân" showBack>
            <RegisterPatient />
          </PageShell>
        }
      />

      <Route
        path="/register-bhyt"
        element={
          <PageShell title="Đăng Ký Thẻ BHYT" showBack>
            <RequirePatient><RegisterBHYT /></RequirePatient>
          </PageShell>
        }
      />

      {/* Flow chung: bhyt | service | booking */}
      <Route
        path="/flow/:mode/step-1"
        element={
          <PageShell title="Đăng Ký Khám Bệnh" showBack>
            <RequirePatient><PatientStep /></RequirePatient>
          </PageShell>
        }
      />
      <Route
        path="/flow/:mode/step-2"
        element={
          <PageShell title="Chọn Dịch Vụ" showBack>
            <RequirePatient><ServiceStep /></RequirePatient>
          </PageShell>
        }
      />
      <Route
        path="/flow/:mode/step-3"
        element={
          <PageShell title="In Phiếu Khám" showBack>
            <RequirePatient><AppointmentStep /></RequirePatient>
          </PageShell>
        }
      />

      {/* tuỳ chọn: redirect các url cũ /flow-bhyt/* sang flow mới */}
      <Route path="/flow-bhyt/:rest*" element={<Navigate to="/flow/bhyt/step-1" replace />} />

      <Route
        path="/profile"
        element={
          <PageShell title="Tài Khoản" showBack>
            <RequirePatient><ProfilePage /></RequirePatient>
          </PageShell>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
