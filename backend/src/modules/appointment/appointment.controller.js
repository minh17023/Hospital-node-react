import { AppError } from "../../core/http/error.js";
import { AppointmentService } from "./appointment.service.js";

export const AppointmentController = {
  /* ===== PATIENT ===== */
  async createOnline(req, res, next) {
    try {
      const idLichLamViec = Number(req.params.idLichLamViec);
      const appt = await AppointmentService.createOnline(idLichLamViec, req.body || {});
      res.json(appt); // có phiKhamGoc, phiDaGiam
    } catch (e) { next(e); }
  },

  async createWalkin(req, res, next) {
    try {
      const appt = await AppointmentService.createWalkin(req.body || {});
      res.json(appt); // có phiKhamGoc, phiDaGiam
    } catch (e) { next(e); }
  },

  async myList(req, res, next) {
    try {
      const u = req.user || {};
      if (u.kind !== "PATIENT") throw new AppError(403, "Chỉ bệnh nhân");
      const q = req.query || {};
      const items = await AppointmentService.listByPatient(Number(u.idBenhNhan), {
        from: q.from || null,
        to: q.to || null,
        status: q.status || "ALL",
        limit: q.limit ? Number(q.limit) : 50,
        offset: q.offset ? Number(q.offset) : 0,
      });
      res.json({ items });
    } catch (e) { next(e); }
  },

  /* ===== COMMON ===== */
  async get(req, res, next) {
    try {
      const appt = await AppointmentService.getById(Number(req.params.id));
      if (!appt) throw new AppError(404, "Không tìm thấy lịch hẹn");

      const u = req.user || {};
      if (u.kind === "PATIENT" && Number(u.idBenhNhan) !== Number(appt.idBenhNhan)) {
        throw new AppError(403, "Chỉ xem được lịch của bạn");
      }
      res.json(appt);
    } catch (e) { next(e); }
  },

  /* ===== DOCTOR & ADMIN ===== */
  async list(req, res, next) {
    try {
      const items = await AppointmentService.list({
        idBacSi: req.query.idBacSi ? Number(req.query.idBacSi) : null,
        ngay: req.query.ngay || null,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0
      });
      res.json({ items });
    } catch (e) { next(e); }
  },

  async updateStatus(req, res, next) {
    try {
      await AppointmentService.updateStatus(
        Number(req.params.id),
        Number(req.body.trangThai)
      );
      res.json({ updated: true });
    } catch (e) { next(e); }
  },

  async cancelMy(req, res, next) {
    try {
      const id = Number(req.params.id);
      const appt = await AppointmentService.getById(id);
      if (!appt) throw new AppError(404, "Không tìm thấy lịch hẹn");
      const u = req.user || {};
      if (u.kind !== "PATIENT" || Number(u.idBenhNhan) !== Number(appt.idBenhNhan)) {
        throw new AppError(403, "Chỉ hủy lịch của bạn");
      }
      await AppointmentService.cancel(id, "patient");
      res.json({ cancelled: true });
    } catch (e) { next(e); }
  },

  async cancelByStaff(req, res, next) {
    try {
      await AppointmentService.cancel(Number(req.params.id), "staff");
      res.json({ cancelled: true });
    } catch (e) { next(e); }
  }
};
