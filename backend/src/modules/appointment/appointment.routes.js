import { Router } from "express";
import { AppointmentController } from "./appointment.controller.js";
import { patientSelfOrStaff } from "../../core/middlewares/ownership.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

/* ===== PATIENT ===== */
// Booking: maLichLamViec trên URL
r.post(
  "/appointments/booking/:maLichLamViec",
  authGuard(true),
  patientSelfOrStaff("maBenhNhan"),
  AppointmentController.createOnline
);

// Walk-in (đặt trực tiếp): chỉ khi đang trong ca
r.post(
  "/appointments/walkin",
  authGuard(true),
  patientSelfOrStaff("maBenhNhan"),
  AppointmentController.createWalkin
);

// Lịch của tôi
r.get(
  "/appointments/my",
  authGuard(true),
  patientSelfOrStaff("maBenhNhan"),
  AppointmentController.myList
);

// Hủy lịch của tôi
r.put(
  "/appointments/:maLichHen/cancel",
  authGuard(true),
  patientSelfOrStaff("maBenhNhan"),
  AppointmentController.cancelMy
);

/* ===== COMMON ===== */
r.get("/appointments/:maLichHen", authGuard(true), AppointmentController.get);

/* ===== DOCTOR & ADMIN ===== */
r.get(
  "/appointments",
  authGuard(true),
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),
  AppointmentController.list
);

r.put(
  "/appointments/:maLichHen/status",
  authGuard(true),
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),
  AppointmentController.updateStatus
);

r.put(
  "/appointments/:maLichHen/cancel-by-doctor",
  authGuard(true),
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),
  AppointmentController.cancelByStaff
);

export default r;
