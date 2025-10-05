import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

// Public
r.get("/doctors", DoctorController.list);
r.get("/doctors/:maBacSi", DoctorController.get);
r.get("/specialties/:maChuyenKhoa/doctors", DoctorController.listBySpecialty);

// Admin/Doctor
r.post("/doctors", authGuard(true), requireRole(ROLES.ADMIN), DoctorController.create);
r.put("/doctors/:maBacSi", authGuard(true), requireRole(ROLES.ADMIN, ROLES.DOCTOR), DoctorController.update);
r.delete("/doctors/:maBacSi", authGuard(true), requireRole(ROLES.ADMIN, ROLES.DOCTOR), DoctorController.remove);

export default r;