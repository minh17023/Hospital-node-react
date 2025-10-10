import { Router } from "express";
import { AnalyticController } from "./analytic.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";
const r = Router();

/**
 * Thống kê tổng quan:
 * GET /analytics/summary
 *  - ?from=YYYY-MM-DD&to=YYYY-MM-DD
 *  - hoặc ?year=2025&month=10
 *  - hoặc ?year=2025
 *
 * Trả về:
 * {
 *   range: { from, to },
 *   revenuePaid, revenueUnpaid,
 *   orders: { total, paid, unpaid, avgPaidOrderValue }
 * }
 */
r.get(
  "/analytics/summary",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  AnalyticController.summary
);

export default r;
