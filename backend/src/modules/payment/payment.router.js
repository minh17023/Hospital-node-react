import { Router } from "express";
import express from "express";
import { PaymentController } from "./payment.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";

const r = Router();

/** Khởi tạo thanh toán (đã có lịch hẹn) */
r.post("/payments", authGuard(true), PaymentController.create);

/** Lấy đơn + list theo lịch hẹn */
r.get("/payments/:id", authGuard(true), PaymentController.get);
r.get("/appointments/:id/payments", authGuard(true), PaymentController.listByAppointment);

/** Webhook Sepay (public, nhận JSON, xác thực qua ?key=...) */
r.post(
  "/payments/webhooks/sepay",
  express.json({ limit: "1mb" }),
  PaymentController.sepayWebhook
);

export default r;
