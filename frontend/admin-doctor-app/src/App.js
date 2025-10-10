import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ROLES } from "./utils/auth";

import Login from "./pages/Login";

// Admin pages
import AdminHome from "./pages/admin/AdminHome";
import AdminAppointments from "./pages/admin/Appointments";
import AdminSchedules from "./pages/admin/Schedules";
import AdminDoctors from "./pages/admin/Doctors";
import AdminPatients from "./pages/admin/Patients";
import AdminPayments from "./pages/admin/Payments";
import AdminUsers from "./pages/admin/users";

// NEW: các trang quản trị bổ sung
import AdminSpecialties from "./pages/admin/Specialties";
import AdminClinics from "./pages/admin/Clinics";
import AdminShifts from "./pages/admin/Shifts";
import AdminWebhooks from "./pages/admin/Webhooks";

// Doctor pages
import DoctorHome from "./pages/doctor/DoctorHome";
import MyAppointments from "./pages/doctor/MyAppointments";
import MySchedule from "./pages/doctor/MySchedule";
import PatientsReadonly from "./pages/doctor/PatientsReadonly";
import Profile from "./pages/doctor/Profile";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminHome />
        </ProtectedRoute>
      }/>
      <Route path="/admin/appointments" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminAppointments />
        </ProtectedRoute>
      }/>
      <Route path="/admin/schedules" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminSchedules />
        </ProtectedRoute>
      }/>
      <Route path="/admin/doctors" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminDoctors />
        </ProtectedRoute>
      }/>
      <Route path="/admin/patients" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminPatients />
        </ProtectedRoute>
      }/>

      {/* NEW: chuyên khoa / phòng / ca / webhooks */}
      <Route path="/admin/specialties" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminSpecialties />
        </ProtectedRoute>
      }/>
      <Route path="/admin/clinics" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminClinics />
        </ProtectedRoute>
      }/>
      <Route path="/admin/shifts" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminShifts />
        </ProtectedRoute>
      }/>
      <Route path="/admin/payments" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminPayments />
        </ProtectedRoute>
      }/>
      <Route path="/admin/users" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <AdminUsers />
        </ProtectedRoute>
      }/>

      {/* Doctor */}
      <Route path="/doctor" element={
        <ProtectedRoute roles={[ROLES.DOCTOR, ROLES.ADMIN]}>
          <DoctorHome />
        </ProtectedRoute>
      }/>
      <Route path="/doctor/my-appointments" element={
        <ProtectedRoute roles={[ROLES.DOCTOR, ROLES.ADMIN]}>
          <MyAppointments />
        </ProtectedRoute>
      }/>
      <Route path="/doctor/my-schedule" element={
        <ProtectedRoute roles={[ROLES.DOCTOR, ROLES.ADMIN]}>
          <MySchedule />
        </ProtectedRoute>
      }/>
      <Route path="/doctor/patients" element={
        <ProtectedRoute roles={[ROLES.DOCTOR, ROLES.ADMIN]}>
          <PatientsReadonly />
        </ProtectedRoute>
      }/>
      <Route path="/doctor/profile" element={
        <ProtectedRoute roles={[ROLES.DOCTOR, ROLES.ADMIN]}>
          <Profile />
        </ProtectedRoute>
      }/>

      {/* default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
