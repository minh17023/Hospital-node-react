import { Routes, Route, Navigate } from "react-router-dom";
import PageShell from "./components/PageShell/PageShell";

// Pages
import EntryCCCD from "./pages/EntryCCCD/EntryCCCD";
import MenuPage from "./pages/MenuPage/MenuPage";
import RegisterPatient from "./pages/RegisterPatient/RegisterPatient";
import RegisterBHYT from "./pages/RegisterBHYT/RegisterBHYT";
import Step1Patient from "./pages/FlowBHYT/Step1Patient";

export default function App() {
  return (
    <>
      {/* Header & Footer nằm TRONG PageShell; mỗi route bọc 1 shell */}
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
              <MenuPage />
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
              <RegisterBHYT />
            </PageShell>
          }
        />

        <Route
          path="/flow-bhyt/step-1"
          element={
            <PageShell title="Đăng Ký Khám Bệnh BHYT" showBack>
              <Step1Patient />
            </PageShell>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
