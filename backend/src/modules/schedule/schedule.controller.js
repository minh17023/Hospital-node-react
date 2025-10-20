import * as svc from "./schedule.service.js";

export const WorkshiftController = {
  /* ===== FE ===== */
  async getWorkingDays(req, res, next) {
    try {
      const { maBacSi } = req.params;
      const { month } = req.query; // YYYY-MM
      const items = await svc.getWorkingDays(maBacSi, month);
      res.json({ items });
    } catch (e) { next(e); }
  },

  async getShiftsByDate(req, res, next) {
    try {
      const { maBacSi } = req.params;
      const { ngayLamViec } = req.query; // YYYY-MM-DD
      const items = await svc.getShiftsOfDate(maBacSi, ngayLamViec);
      res.json({ items });
    } catch (e) { next(e); }
  },

  /* ===== Admin & Doctor ===== */
  async list(req, res, next) {
    try {
      const ctx = { role: req.user?.role, maBacSi: req.user?.maBacSi, maUser: req.user?.maUser, kind: req.user?.kind };
      const rs = await svc.adminList(req.query || {}, ctx);
      res.json(rs); // { items, total }
    } catch (e) { next(e); }
  },

  /** /schedules/my — giờ trả TẤT CẢ lịch của bác sĩ */
  async listMy(req, res, next) {
    try {
      const ctx = {
        role: req.user?.role,
        maBacSi: req.user?.maBacSi,
        maUser: req.user?.maUser,
        kind: req.user?.kind
      };
      // query phải có maBacSi
      const rs = await svc.listMy(req.query || {}, ctx);
      res.json(rs); // { items, total }
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const ctx = { role: req.user?.role, maBacSi: req.user?.maBacSi, maUser: req.user?.maUser, kind: req.user?.kind };
      const rs = await svc.adminCreate(req.body || {}, ctx);
      res.status(201).json(rs);
    } catch (e) { next(e); }
  },

  async generate(req, res, next) {
    try {
      const ctx = { role: req.user?.role, maBacSi: req.user?.maBacSi, maUser: req.user?.maUser, kind: req.user?.kind };
      const rs = await svc.adminGenerate(req.body || {}, ctx);
      res.status(201).json(rs);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const ctx = { role: req.user?.role, maBacSi: req.user?.maBacSi, maUser: req.user?.maUser, kind: req.user?.kind };
      const rs = await svc.adminUpdate(req.params.maLichLamViec, req.body || {}, ctx);
      res.json(rs);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const ctx = { role: req.user?.role, maBacSi: req.user?.maBacSi, maUser: req.user?.maUser, kind: req.user?.kind };
      const rs = await svc.adminRemove(req.params.maLichLamViec, ctx);
      res.json(rs);
    } catch (e) { next(e); }
  },
};
