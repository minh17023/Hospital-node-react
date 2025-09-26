import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";

const r = Router();

/** Khởi tạo thanh toán (đã có lịch hẹn) */
r.post("/payments", authGuard(true), PaymentController.create);

/** Lấy đơn + list theo lịch hẹn */
r.get("/payments/:id", authGuard(true), PaymentController.get);
r.get("/appointments/:id/payments", authGuard(true), PaymentController.listByAppointment);

/** Webhook Sepay (public) */
r.post("/payments/webhooks/sepay", PaymentController.sepayWebhook);

export default r;
