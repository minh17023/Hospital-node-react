import { Router } from "express";
import { InsuranceController } from "./insurance.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { patientSelfOrStaff } from "../../core/middlewares/ownership.js";

const r = Router();

// Lấy thẻ BHYT của bệnh nhân (1-1)
r.get(
  "/patients/:idBenhNhan/bhyt",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  InsuranceController.getByPatient
);

// Tạo thẻ BHYT (nếu đã có -> 409)
r.post(
  "/patients/:idBenhNhan/bhyt",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  InsuranceController.create
);

// Cập nhật thẻ hiện có
r.put(
  "/patients/:idBenhNhan/bhyt",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  InsuranceController.update
);

// Boolean: có thẻ còn hạn không?
r.get(
  "/patients/:idBenhNhan/insurance/has-valid",
  authGuard(true),
  patientSelfOrStaff("idBenhNhan"),
  InsuranceController.hasValid
);

export default r;
