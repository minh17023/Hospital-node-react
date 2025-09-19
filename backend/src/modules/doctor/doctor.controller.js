import { DoctorService } from "./doctor.service.js";

export const DoctorController = {
  async get(req, res, next) {
    try {
      const data = await DoctorService.getById(req.params.id);
      res.json(data);
    } catch (e) { next(e); }
  },

  async list(req, res, next) {
    try {
      const data = await DoctorService.list(req.query);
      res.json(data);
    } catch (e) { next(e); }
  },

  async listBySpecialty(req, res, next) {
    try {
      const data = await DoctorService.listBySpecialty(req.params.idChuyenKhoa, req.query);
      res.json(data);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const data = await DoctorService.update(req.params.id, req.body || {});
      res.json(data);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const data = await DoctorService.remove(req.params.id);
      res.json(data);
    } catch (e) { next(e); }
  },
};
