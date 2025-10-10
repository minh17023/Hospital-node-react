import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { patientSelfOrStaff } from "../../core/middlewares/ownership.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

// Lấy hồ sơ của chính mình + danh sách BHYT
r.get("/patients/me", authGuard(true), PatientController.me);

// Danh sách toàn bộ bệnh nhân (ADMIN)
r.get(
  "/patients",
  authGuard(true),
  requireRole(ROLES.ADMIN,ROLES.DOCTOR),
  PatientController.list
);

// Xem hồ sơ theo MÃ (bệnh nhân của mình hoặc nhân sự)
r.get(
  "/patients/:maBenhNhan",
  authGuard(true),
  patientSelfOrStaff("maBenhNhan"),
  PatientController.getOne
);

// Cập nhật hồ sơ (bệnh nhân của mình hoặc nhân sự)
r.put(
  "/patients/:maBenhNhan",
  authGuard(true),
  patientSelfOrStaff("maBenhNhan"),
  PatientController.update
);

// Xoá hồ sơ — chỉ ADMIN
r.delete(
  "/patients/:maBenhNhan",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  PatientController.remove
);

export default r;
