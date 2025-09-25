import { Router } from "express";
import { WorkshiftController } from "./workshift.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

/* ===== FE / public ===== */
r.get("/doctors/:doctorId/working-days", WorkshiftController.getWorkingDays);
r.get("/doctors/:doctorId/shifts",       WorkshiftController.getShiftsByDate);

/* ===== Admin & Doctor ===== */
// List: Admin xem tất; Doctor chỉ của mình (lọc trong service)
r.get("/workshifts", authGuard(true), WorkshiftController.list);

// Tạo 1 ca: Admin hoặc Doctor (Doctor chỉ tạo cho chính mình)
r.post("/workshifts",
  authGuard(true),
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  WorkshiftController.create
);

// Generate nhiều ca: chỉ Admin
r.post("/workshifts/generate",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  WorkshiftController.generate
);

// Cập nhật (PUT): Admin hoặc Doctor (Doctor chỉ ca của mình)
r.put("/workshifts/:idLichLamViec",
  authGuard(true),
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  WorkshiftController.update
);

// Xoá: Admin hoặc Doctor (Doctor chỉ ca của mình + chưa ai đặt)
r.delete("/workshifts/:idLichLamViec",
  authGuard(true),
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  WorkshiftController.remove
);

export default r;
