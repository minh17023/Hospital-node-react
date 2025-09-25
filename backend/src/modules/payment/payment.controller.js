import { PaymentService } from "./payment.service.js";
import { env } from "../../config/env.js";
import { AppError } from "../../core/http/error.js";
import { AppointmentService } from "../appointment/appointment.service.js";

/** Xác thực Sepay bằng API Key hoặc Bearer Token (2 biến riêng) */
function verifySepay(req) {
  const hAuth = (req.headers.authorization || "").trim();
  const xKey  = (req.headers["x-api-key"] || "").trim();
  const qKey  = (req.query.key || "").toString().trim();
  const qTok  = (req.query.token || "").toString().trim();

  const apiKey = env.pay.sepayWebhookKey || "";
  const token  = env.pay.sepayWebhookToken || "";

  const okApiKey =
    apiKey &&
    (
      hAuth.toLowerCase().startsWith("apikey ") && hAuth.slice(7).trim() === apiKey ||
      xKey === apiKey ||
      qKey === apiKey
    );

  const okBearer =
    token &&
    (
      hAuth.toLowerCase().startsWith("bearer ") && hAuth.slice(7).trim() === token ||
      xKey === token ||
      qTok === token
    );

  return !!(okApiKey || okBearer);
}

export const PaymentController = {
  /** Khởi tạo đơn thanh toán (đã có id lịch hẹn) */
  async create(req, res, next) {
    try {
      const { idLichHen } = req.body || {};
      if (!idLichHen) throw new AppError(400, "Thiếu idLichHen");
      const data = await PaymentService.createForAppointment(Number(idLichHen));
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

  /** Combo: đặt lịch online + tạo đơn thanh toán */
  async bookOnlineAndPay(req, res, next) {
    try {
      const idLichLamViec = Number(req.params.idLichLamViec);
      const appt = await AppointmentService.createOnline(idLichLamViec, req.body || {});
      const payment = await PaymentService.createForAppointment(appt.idLichHen);
      res.status(201).json({ appointment: appt, payment });
    } catch (e) { next(e); }
  },

  /** Combo: walk-in + tạo đơn thanh toán */
  async walkinAndPay(req, res, next) {
    try {
      const appt = await AppointmentService.createWalkin(req.body || {});
      const payment = await PaymentService.createForAppointment(appt.idLichHen);
      res.status(201).json({ appointment: appt, payment });
    } catch (e) { next(e); }
  },

  /** Webhook Sepay */
  async sepayWebhook(req, res, next) {
    try {
      if (!verifySepay(req)) return res.status(401).json({ error: "unauthorized" });
      await PaymentService.applyWebhook(req.body || {});  // dùng applyWebhook (đúng tên)
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
};
