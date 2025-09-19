import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

// Public GET
r.get("/doctors", authGuard(false), DoctorController.list);
r.get("/doctors/:id", authGuard(false), DoctorController.get);
r.get("/specialties/:idChuyenKhoa/doctors", authGuard(false), DoctorController.listBySpecialty);

// Update: cho ADMIN hoặc DOCTOR (staff) sửa
r.put("/doctors/:id",
  authGuard(true),
  requireRole(ROLES.DOCTOR, ROLES.ADMIN),       
  DoctorController.update
);

// Delete: chỉ ADMIN
r.delete("/doctors/:id",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  DoctorController.remove
);

export default r;
