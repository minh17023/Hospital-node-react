// src/modules/doctor/doctor.routes.js
import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

// Public
r.get("/doctors", DoctorController.list);
r.get("/doctors/:id", DoctorController.get);

r.get("/specialties/:idChuyenKhoa/doctors", DoctorController.listBySpecialty);

// Admin 
r.post("/doctors", authGuard(true), requireRole(ROLES.ADMIN), DoctorController.create);
r.put("/doctors/:id", authGuard(true), requireRole(ROLES.ADMIN, ROLES.DOCTOR), DoctorController.update);
r.delete("/doctors/:id", authGuard(true), requireRole(ROLES.ADMIN, ROLES.DOCTOR), DoctorController.remove);

export default r;
