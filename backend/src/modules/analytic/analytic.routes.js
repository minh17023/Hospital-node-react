import { Router } from "express";
import { AnalyticController, DoctorStatsController } from "./analytic.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

/* ===== Admin analytics ===== */
r.get(
  "/analytics/summary",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  AnalyticController.summary
);

/* ===== Doctor stats (API duy nhất phía DoctorHome) ===== */
r.get(
  "/doctor/appointments/stats",
  authGuard(true),
  requireRole(ROLES.DOCTOR),
  DoctorStatsController.stats
);

// (tuỳ chọn) alias để dễ nhớ:
// r.get("/doctor/stats", authGuard(true), requireRole(ROLES.DOCTOR), DoctorStatsController.stats);

export default r;
