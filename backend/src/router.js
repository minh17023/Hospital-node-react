import { Router } from "express";
import authRouter from "./modules/auth/index.js";
import insuranceRouter from "./modules/insurance/insurance.routes.js";

const api = Router();

// /api/v1/auth/...
api.use("/auth", authRouter);

// /api/v1/patients/... ; /api/v1/insurance/cards/...
api.use("/", insuranceRouter);

export default api;
