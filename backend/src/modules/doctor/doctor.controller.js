// src/modules/doctor/doctor.controller.js
import { DoctorService } from "./doctor.service.js";

export const DoctorController = {
  async list(req, res, next) {
    try {
      const {
        idChuyenKhoa, q, trangThai, feeMin, feeMax,
        limit = 50, offset = 0,
      } = req.query;
      const items = await DoctorService.list({
        idChuyenKhoa, q, trangThai,
        feeMin, feeMax, limit, offset,
      });
      res.json({ items });
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const item = await DoctorService.getById(Number(req.params.id));
      if (!item) return res.status(404).json({ message: "Không tìm thấy bác sĩ" });
      res.json(item);
    } catch (e) { next(e); }
  },

  async listBySpecialty(req, res, next) {
    try {
      const { idChuyenKhoa } = req.params;
      const { trangThai, limit = 50, offset = 0 } = req.query || {};
      const items = await DoctorService.listBySpecialty(Number(idChuyenKhoa), {
        trangThai, limit, offset
      });
      res.json({ items });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const created = await DoctorService.create(req.body || {});
      res.status(201).json(created);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const updated = await DoctorService.update(Number(req.params.id), req.body || {});
      res.json(updated);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await DoctorService.remove(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { next(e); }
  },
};
