import { Router } from "express";
import { WorkshiftController } from "./workshift.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";

const r = Router();

/* Admin CRUD Ca làm việc */
r.get(   "/workshifts",                 authGuard(true), requireRole(ROLES.ADMIN), WorkshiftController.list);
r.get(   "/workshifts/:maCaLamViec",    authGuard(true), requireRole(ROLES.ADMIN), WorkshiftController.get);
r.post(  "/workshifts",                 authGuard(true), requireRole(ROLES.ADMIN), WorkshiftController.create);
r.put(   "/workshifts/:maCaLamViec",    authGuard(true), requireRole(ROLES.ADMIN), WorkshiftController.update);
r.delete("/workshifts/:maCaLamViec",    authGuard(true), requireRole(ROLES.ADMIN), WorkshiftController.remove);

export default r;
