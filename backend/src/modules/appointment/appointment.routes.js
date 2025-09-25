import { Router } from "express";
import { AppointmentController } from "./appointment.controller.js";
import { patientSelfOrStaff } from "../../core/middlewares/ownership.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

/* ===== PATIENT ===== */
// Booking: idLichLamViec trên URL
r.post(
  "/appointments/booking/:idLichLamViec",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  AppointmentController.createOnline
);

// Walk-in (đặt trực tiếp): chỉ khi đang trong ca
r.post(
  "/appointments/walkin",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  AppointmentController.createWalkin
);

// Lịch của tôi
r.get(
  "/appointments/my",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  AppointmentController.myList
);

// Hủy lịch của tôi
r.put(
  "/appointments/:id/cancel",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  AppointmentController.cancelMy
);

/* ===== COMMON ===== */
r.get("/appointments/:id", authGuard(true), AppointmentController.get);

/* ===== DOCTOR & ADMIN ===== */
r.get(
  "/appointments",
  authGuard(true),
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),
  AppointmentController.list
);

r.put(
  "/appointments/:id/status",
  authGuard(true),
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),
  AppointmentController.updateStatus
);

r.put(
  "/appointments/:id/cancel-by-doctor",
  authGuard(true),
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),
  AppointmentController.cancelByStaff
);

export default r;
