import { DoctorService } from "./doctor.service.js";

export const DoctorController = {
  async list(req, res, next) {
    try {
      const {
        maChuyenKhoa, q, trangThai, feeMin, feeMax,
        limit = 50, offset = 0,
      } = req.query || {};
      const items = await DoctorService.list({
        maChuyenKhoa, q, trangThai, feeMin, feeMax, limit, offset,
      });
      res.json({ items });
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const item = await DoctorService.getByMa(String(req.params.maBacSi || ""));
      if (!item) return res.status(404).json({ message: "Không tìm thấy bác sĩ" });
      res.json(item);
    } catch (e) { next(e); }
  },

  async listBySpecialty(req, res, next) {
    try {
      const { maChuyenKhoa } = req.params;
      const { trangThai, limit = 50, offset = 0 } = req.query || {};
      const items = await DoctorService.listBySpecialty(String(maChuyenKhoa), {
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
      const updated = await DoctorService.update(String(req.params.maBacSi || ""), req.body || {});
      res.json(updated);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await DoctorService.remove(String(req.params.maBacSi || ""));
      res.json({ ok: true });
    } catch (e) { next(e); }
  },

  async getByUser(req, res, next) {
    try {
      const maUser = String(req.params.maUser || "");
      const item = await DoctorService.getByUser(maUser);
      if (!item) return res.status(404).json({ message: "Không tìm thấy hồ sơ bác sĩ theo maUser" });
      res.json(item);
    } catch (e) { next(e); }
  },
};
