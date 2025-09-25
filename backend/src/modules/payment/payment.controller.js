import { PaymentService } from "./payment.service.js";
import { env } from "../../config/env.js";
import { AppError } from "../../core/http/error.js";
import { AppointmentService } from "../appointment/appointment.service.js"; 

function verifySepay(req) {
  const hAuth = req.headers.authorization || "";
  const bearer = hAuth.startsWith("Bearer ") ? hAuth.slice(7) : null;
  const xKey = req.headers["x-api-key"];
  const qTok = req.query.token;
  const token = bearer || xKey || qTok;
  return token && token === env.pay.sepayWebhookToken;
}

export const PaymentController = {
  // Khởi tạo thanh toán sau khi đã có id lịch hẹn
  async create(req, res, next) {
    try {
      const { idLichHen, ttlMinutes } = req.body || {};
      if (!idLichHen) throw new AppError(400, "Thiếu idLichHen");
      const data = await PaymentService.createForAppointment(Number(idLichHen), { ttlMinutes });
      res.status(201).json(data);
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const id = Number(req.params.id);
      const data = await PaymentService.getOrder(id);
      res.json(data);
    } catch (e) { next(e); }
  },

  async listByAppointment(req, res, next) {
    try {
      const idLichHen = Number(req.params.id);
      const items = await PaymentService.listByAppointment(idLichHen);
      res.json({ items });
    } catch (e) { next(e); }
  },

  // Combo: đặt lịch online + tạo đơn thanh toán luôn
  async bookOnlineAndPay(req, res, next) {
    try {
      const idLichLamViec = Number(req.params.idLichLamViec);
      const appt = await AppointmentService.createOnline(idLichLamViec, req.body || {});
      const payment = await PaymentService.createForAppointment(appt.idLichHen, {});
      res.status(201).json({ appointment: appt, payment });
    } catch (e) { next(e); }
  },

  // Combo: walk-in + tạo đơn thanh toán luôn
  async walkinAndPay(req, res, next) {
    try {
      const appt = await AppointmentService.createWalkin(req.body || {});
      const payment = await PaymentService.createForAppointment(appt.idLichHen, {});
      res.status(201).json({ appointment: appt, payment });
    } catch (e) { next(e); }
  },

  async sepayWebhook(req, res, next) {
    try {
      if (!verifySepay(req)) return res.status(401).json({ error: "unauthorized" });
      await PaymentService.sepayWebhook(req.body || {});
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
};
