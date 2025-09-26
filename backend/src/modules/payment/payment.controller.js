import { PaymentService } from "./payment.service.js";

export const PaymentController = {
  async create(req, res, next) {
    try {
      const view = await PaymentService.create({ idLichHen: req.body?.idLichHen });
      res.status(201).json(view);
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const view = await PaymentService.getById(req.params.id);
      if (!view) return res.status(404).json({ message: "Không tìm thấy đơn" });
      res.json(view);
    } catch (e) { next(e); }
  },

  async listByAppointment(req, res, next) {
    try {
      const items = await PaymentService.listByAppointment(req.params.id);
      res.json({ items });
    } catch (e) { next(e); }
  },

  async sepayWebhook(req, res, next) {
    try {
      const result = await PaymentService.handleSepayWebhook(req);
      res.json(result);
    } catch (e) { next(e); }
  },
};
