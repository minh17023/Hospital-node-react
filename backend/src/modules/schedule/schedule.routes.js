import { Router } from "express";
import { WorkshiftController } from "./schedule.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

/* ===== FE / public ===== */
r.get("/doctors/:maBacSi/schedule-days", WorkshiftController.getWorkingDays);
r.get("/doctors/:maBacSi/schedules",       WorkshiftController.getShiftsByDate);

/* ===== Admin & Doctor ===== */
// Tổng thể: Admin xem tất; Doctor chỉ của mình (lọc trong service)
r.get("/schedules", authGuard(true), WorkshiftController.list);

// My schedules: chỉ Doctor
r.get(
  "/schedules/my",
  authGuard(true),
  requireRole(ROLES.DOCTOR),
  WorkshiftController.listMy
);

// Tạo 1 ca: Admin hoặc Doctor (Doctor chỉ tạo cho chính mình)
r.post(
  "/schedules",
  authGuard(true),
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  WorkshiftController.create
);

// Generate nhiều ca: chỉ Admin
r.post(
  "/schedules/generate",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  WorkshiftController.generate
);

// Cập nhật (PUT): Admin hoặc Doctor (Doctor chỉ ca của mình)
r.put(
  "/schedules/:maLichLamViec",
  authGuard(true),
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  WorkshiftController.update
);

// Xoá: Admin hoặc Doctor (Doctor chỉ ca của mình + chưa ai đặt)
r.delete(
  "/schedules/:maLichLamViec",
  authGuard(true),
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  WorkshiftController.remove
);

export default r;
