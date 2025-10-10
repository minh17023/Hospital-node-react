import { PaymentService } from "./payment.service.js";

export const PaymentController = {
  async create(req, res, next) {
    try {
      const view = await PaymentService.create({ maLichHen: req.body?.maLichHen });
      res.status(201).json(view);
    } catch (e) { next(e); }
  },

  // GET /payments/:maDonHang
  async get(req, res, next) {
    try {
      const view = await PaymentService.getSimpleByMa(req.params.maDonHang);
      if (!view) return res.status(404).json({ message: "Không tìm thấy đơn" });
      res.json(view);
    } catch (e) { next(e); }
  },

  // GET /appointments/:maLichHen/payments
  async listByAppointment(req, res, next) {
    try {
      const items = await PaymentService.listByAppointment(req.params.maLichHen);
      res.json({ items });
    } catch (e) { next(e); }
  },

  async sepayWebhook(req, res, next) {
    try {
      const result = await PaymentService.handleSepayWebhook(req);
      res.json(result);
    } catch (e) { next(e); }
  },

  //  GET /payments  (list tất cả, chỉ các cột yêu cầu)
  async listAll(req, res, next) {
    try {
      const { q, status, limit, offset } = req.query;
      const data = await PaymentService.listAllSimple({
        q,
        status: status === undefined ? undefined : Number(status),
        limit,
        offset,
      });
      res.json(data);
    } catch (e) { next(e); }
  },
};
