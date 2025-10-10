import { Router } from "express";
import express from "express";
import { PaymentController } from "./payment.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";
import { requireRole } from "../../core/middlewares/roles.guard.js";
import { ROLES } from "../../core/auth/roles.js";


const r = Router();

r.get("/payments", authGuard(true), requireRole(ROLES.ADMIN) , PaymentController.listAll);

/** Khởi tạo thanh toán (đã có lịch hẹn) — body: { maLichHen } */
r.post("/payments", authGuard(true), PaymentController.create);

/** Lấy đơn + list theo MÃ lịch hẹn */
r.get("/payments/:maDonHang", authGuard(true), PaymentController.get);
r.get("/appointments/:maLichHen/payments", authGuard(true), PaymentController.listByAppointment);

/** Webhook Sepay (public, nhận JSON, xác thực qua ?key=...) */
r.post(
  "/payments/webhooks/sepay",
  express.json({ limit: "1mb" }),
  PaymentController.sepayWebhook
);

export default r;
