import { WorkshiftService } from "./workshift.service.js";

export const WorkshiftController = {
  async list(req, res, next) {
    try { res.json(await WorkshiftService.list(req.query || {})); }
    catch (e) { next(e); }
  },

  async get(req, res, next) {
    try { res.json(await WorkshiftService.get(String(req.params.maCaLamViec))); }
    catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const row = await WorkshiftService.create(req.body || {});
      res.status(201).json(row);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const row = await WorkshiftService.update(String(req.params.maCaLamViec), req.body || {});
      res.json(row);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try { res.json(await WorkshiftService.remove(String(req.params.maCaLamViec))); }
    catch (e) { next(e); }
  }
};
