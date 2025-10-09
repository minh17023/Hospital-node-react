import { Router } from "express";
import { AdminDoctorUserController, DoctorAuthController} from "./doctor.controller.js";
import { authGuard } from "../../../core/middlewares/auth.guard.js";
import { requireRole } from "../../../core/middlewares/roles.guard.js";
import { ROLES } from "../../../core/auth/roles.js";

const r = Router();

r.post(
  "/register-user",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  AdminDoctorUserController.registerDoctorUser
);

r.post("/login", DoctorAuthController.login);

export default r;