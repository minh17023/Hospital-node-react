import { Router } from "express";
import { UsersController } from "./users.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

r.get(
  "/users",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  UsersController.list
);

r.get(
  "/users/:maUser",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  UsersController.getOne
);

r.put(
  "/users/:maUser",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  UsersController.update
);

r.delete(
  "/users/:maUser",
  authGuard(true),
  requireRole(ROLES.ADMIN),
  UsersController.remove
);

export default r;
