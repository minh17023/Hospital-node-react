import { AppError } from "../../core/http/error.js";
import { AppointmentService } from "./appointment.service.js";

const getCode = (req) =>
  String(req.params.maLichHen || req.params.ma || req.params.id || "");

export const AppointmentController = {
  /* ===== PATIENT ===== */
  async createOnline(req, res, next) {
    try {
      const maLichLamViec = String(req.params.maLichLamViec || "");
      const appt = await AppointmentService.createOnline(maLichLamViec, req.body || {});
      res.json(appt);
    } catch (e) { next(e); }
  },

  async createWalkin(req, res, next) {
    try {
      const appt = await AppointmentService.createWalkin(req.body || {});
      res.json(appt);
    } catch (e) { next(e); }
  },

  async myList(req, res, next) {
    try {
      const u = req.user || {};
      if (u.kind !== "PATIENT") throw new AppError(403, "Chỉ bệnh nhân");
      const q = req.query || {};
      const items = await AppointmentService.listByPatient(String(u.maBenhNhan), {
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
      const ma = getCode(req);                 // <— đọc đúng tên tham số
      const appt = await AppointmentService.getById(ma);
      if (!appt) throw new AppError(404, "Không tìm thấy lịch hẹn");

      const u = req.user || {};
      if (u.kind === "PATIENT" && String(u.maBenhNhan) !== String(appt.maBenhNhan)) {
        throw new AppError(403, "Chỉ xem được lịch của bạn");
      }
      res.json(appt);
    } catch (e) { next(e); }
  },

  /* ===== DOCTOR & ADMIN ===== */
async list(req, res, next) {
  try {
    const items = await AppointmentService.list({
      maBacSi: req.query.maBacSi ? String(req.query.maBacSi) : null,
      ngay: req.query.ngay || null,
      status: req.query.status ?? null,    // NEW: có thể truyền -1/1/2/3/5 hoặc để trống
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0
    });
    res.json({ items });
  } catch (e) { next(e); }
},

  async updateStatus(req, res, next) {
    try {
      const ma = getCode(req);                 // <—
      await AppointmentService.updateStatus(ma, Number(req.body.trangThai));
      res.json({ updated: true });
    } catch (e) { next(e); }
  },

  async cancelMy(req, res, next) {
    try {
      const ma = getCode(req);                 // <—
      const appt = await AppointmentService.getById(ma);
      if (!appt) throw new AppError(404, "Không tìm thấy lịch hẹn");
      const u = req.user || {};
      if (u.kind !== "PATIENT" || String(u.maBenhNhan) !== String(appt.maBenhNhan)) {
        throw new AppError(403, "Chỉ hủy lịch của bạn");
      }
      await AppointmentService.cancel(ma, "patient");
      res.json({ cancelled: true });
    } catch (e) { next(e); }
  },

  async cancelByStaff(req, res, next) {
    try {
      const ma = getCode(req);                 // <—
      await AppointmentService.cancel(ma, "staff");
      res.json({ cancelled: true });
    } catch (e) { next(e); }
  }
  
};
