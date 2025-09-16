import { Router } from "express";
import { PatientAuthController } from "./patient.controller.js";
import { authGuard } from "../../../core/middlewares/auth.guard.js";

const r = Router();

// đăng ký hồ sơ BN (không kèm BHYT)
r.post("/register", authGuard(false), PatientAuthController.register);

// login CCCD
r.post("/login", PatientAuthController.login);

// lấy hồ sơ + bhyt
r.get("/me", authGuard(true), PatientAuthController.me);

export default r;
