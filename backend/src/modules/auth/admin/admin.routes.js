import { Router } from "express";
import { loginLimiter } from "../../../core/middlewares/rate-limit.js";
import { AdminAuthController } from "./admin.controller.js";

const r = Router();
r.post("/login", loginLimiter, AdminAuthController.login);
export default r;
