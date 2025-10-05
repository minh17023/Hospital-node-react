import { Router } from "express";
import { ClinicController } from "./clinic.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

// --- Read: public / hoặc có token cũng OK ---
r.get("/clinics", authGuard(false), ClinicController.list);
r.get("/specialties/:maChuyenKhoa/clinics", authGuard(false), ClinicController.listBySpecialty);

// --- Write: ADMIN ---
r.post("/clinics", authGuard(true), requireRole(ROLES.ADMIN), ClinicController.create);
r.put("/clinics/:maPhongKham", authGuard(true), requireRole(ROLES.ADMIN), ClinicController.update);
r.delete("/clinics/:maPhongKham", authGuard(true), requireRole(ROLES.ADMIN), ClinicController.remove);

export default r;