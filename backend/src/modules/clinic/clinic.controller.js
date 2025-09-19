import { ClinicService } from "./clinic.service.js";

export const ClinicController = {
  async list(req, res, next) {
    try {
      const data = await ClinicService.list(req.query || {});
      res.json(data);
    } catch (e) { next(e); }
  },

  async listBySpecialty(req, res, next) {
    try {
      const items = await ClinicService.listBySpecialty(
        Number(req.params.idChuyenKhoa),
        req.query || {}
      );
      res.json(items);
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const item = await ClinicService.create(req.body || {});
      res.status(201).json(item);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const item = await ClinicService.update(
        Number(req.params.idPhongKham),
        req.body || {}
      );
      res.json(item);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await ClinicService.remove(Number(req.params.idPhongKham));
      res.status(204).end();
    } catch (e) { next(e); }
  },
};
