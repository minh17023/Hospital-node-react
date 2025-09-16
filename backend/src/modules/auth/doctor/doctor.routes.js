import { Router } from "express";
import { DoctorAuthController } from "./doctor.controller.js";

const r = Router();
r.post("/register", DoctorAuthController.register);
r.post("/login", DoctorAuthController.login);

export default r;
