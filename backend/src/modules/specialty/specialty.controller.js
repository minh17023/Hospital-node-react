import { SpecialtyService } from "./specialty.service.js";

export const SpecialtyController = {
  // Public
  async list(req, res, next) {
    try {
      const items = await SpecialtyService.list();
      res.json({ items });
    } catch (e) { next(e); }
  },

  // Public
  async detail(req, res, next) {
    try {
      const ma = String(req.params.maChuyenKhoa || "");
      const data = await SpecialtyService.detail(ma);
      res.json(data);
    } catch (e) { next(e); }
  },

  // Admin
  async create(req, res, next) {
    try {
      const created = await SpecialtyService.create(req.body || {});
      res.status(201).json(created);
    } catch (e) { next(e); }
  },

  // Admin
  async update(req, res, next) {
    try {
      const ma = String(req.params.maChuyenKhoa || "");
      const updated = await SpecialtyService.update(ma, req.body || {});
      res.json(updated);
    } catch (e) { next(e); }
  },

  // Admin
  async remove(req, res, next) {
    try {
      const ma = String(req.params.maChuyenKhoa || "");
      await SpecialtyService.remove(ma);
      res.status(204).end();
    } catch (e) { next(e); }
  }
};
