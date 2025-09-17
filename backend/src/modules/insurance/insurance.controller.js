import { AppError } from "../../core/http/error.js";
import { InsuranceService } from "./insurance.service.js";

export const InsuranceController = {
  // GET /patients/:idBenhNhan/bhyt
  async getByPatient(req, res, next) {
    try {
      const idBenhNhan = Number(req.params.idBenhNhan);
      if (!idBenhNhan) throw new AppError(400, "Thiếu idBenhNhan");

      const card = await InsuranceService.getByPatient(idBenhNhan);
      res.json({ bhyt: card }); // card hoặc null
    } catch (e) { next(e); }
  },

  // POST /patients/:idBenhNhan/bhyt
  async create(req, res, next) {
    try {
      const idBenhNhan = Number(req.params.idBenhNhan);
      const { soThe, denNgay, trangThai = 1 } = req.body || {};
      if (!idBenhNhan || !soThe || !denNgay)
        throw new AppError(400, "Thiếu idBenhNhan/soThe/denNgay");

      const card = await InsuranceService.createOne(idBenhNhan, { soThe, denNgay, trangThai });
      res.status(201).json({ bhyt: card });
    } catch (e) { next(e); }
  },

  // PUT /patients/:idBenhNhan/bhyt
  async update(req, res, next) {
    try {
      const idBenhNhan = Number(req.params.idBenhNhan);
      if (!idBenhNhan) throw new AppError(400, "Thiếu idBenhNhan");

      const card = await InsuranceService.updateByPatient(idBenhNhan, req.body || {});
      res.json({ bhyt: card });
    } catch (e) { next(e); }
  },

  // GET /patients/:idBenhNhan/insurance/has-valid
  async hasValid(req, res, next) {
    try {
      const idBenhNhan = Number(req.params.idBenhNhan);
      if (!idBenhNhan) throw new AppError(400, "Thiếu idBenhNhan");
      const data = await InsuranceService.hasValidByPatient(idBenhNhan);
      res.json(data); // { hasValid: boolean }
    } catch (e) { next(e); }
  }
};
