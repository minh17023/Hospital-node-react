// src/modules/workshift/workshift.controller.js
import * as svc from "./workshift.service.js";

export const WorkshiftController = {
  /* ===== FE ===== */
  async getWorkingDays(req, res, next) {
    try {
      const { doctorId } = req.params;
      const { month } = req.query; // YYYY-MM
      const items = await svc.getWorkingDays(doctorId, month);
      res.json({ items });
    } catch (e) { next(e); }
  },

  async getShiftsByDate(req, res, next) {
    try {
      const { doctorId } = req.params;
      const { ngayLamViec } = req.query; // YYYY-MM-DD
      const items = await svc.getShiftsOfDate(doctorId, ngayLamViec);
      res.json({ items });
    } catch (e) { next(e); }
  },

  /* ===== Admin & Doctor ===== */
  async list(req, res, next) {
    try {
      const ctx = { role: req.user?.role, idBacSi: req.user?.idBacSi };
      const items = await svc.adminList(req.query || {}, ctx);
      res.json({ items });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const ctx = {
        role: req.user?.role,
        idBacSi: req.user?.idBacSi,
        idUser: req.user?.idUser
      };
      const rs = await svc.adminCreate(req.body || {}, ctx);
      res.status(201).json(rs);
    } catch (e) { next(e); }
  },

  async generate(req, res, next) {
    try {
      const ctx = {
        role: req.user?.role,
        idBacSi: req.user?.idBacSi,
        idUser: req.user?.idUser
      };
      const rs = await svc.adminGenerate(req.body || {}, ctx);
      res.status(201).json(rs);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const ctx = { role: req.user?.role, idBacSi: req.user?.idBacSi };
      const rs = await svc.adminUpdate(req.params.idLichLamViec, req.body || {}, ctx);
      res.json(rs);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const ctx = { role: req.user?.role, idBacSi: req.user?.idBacSi };
      const rs = await svc.adminRemove(req.params.idLichLamViec, ctx);
      res.json(rs);
    } catch (e) { next(e); }
  },
};
