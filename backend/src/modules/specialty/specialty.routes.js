import { Router } from "express";
import { SpecialtyController } from "./specialty.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

/** Public: danh sách & chi tiết */
r.get("/specialties", SpecialtyController.list);
r.get("/specialties/:id", SpecialtyController.detail);

/** Admin: tạo, cập nhật, xoá */
r.post(
  "/specialties",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  SpecialtyController.create
);

r.put(
  "/specialties/:id",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  SpecialtyController.update
);

r.delete(
  "/specialties/:id",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  SpecialtyController.remove
);

export default r;
