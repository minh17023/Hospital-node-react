import { AppError } from "../../core/http/error.js";
import { InsuranceService } from "./insurance.service.js";

export const InsuranceController = {
  // GET /patients/:maBenhNhan/bhyt
  async getByPatient(req, res, next) {
    try {
      const maBenhNhan = String(req.params.maBenhNhan || "");
      if (!maBenhNhan) throw new AppError(400, "Thiếu maBenhNhan");

      const card = await InsuranceService.getByPatient(maBenhNhan);
      res.json({ bhyt: card }); // card hoặc null
    } catch (e) { next(e); }
  },

  // POST /patients/:maBenhNhan/bhyt
  async create(req, res, next) {
    try {
      const maBenhNhan = String(req.params.maBenhNhan || "");
      const { soThe, denNgay, trangThai = 1 } = req.body || {};
      if (!maBenhNhan || !soThe || !denNgay)
        throw new AppError(400, "Thiếu maBenhNhan/soThe/denNgay");

      const card = await InsuranceService.createOne(maBenhNhan, { soThe, denNgay, trangThai });
      res.status(201).json({ bhyt: card });
    } catch (e) { next(e); }
  },

  // PUT /patients/:maBenhNhan/bhyt
  async update(req, res, next) {
    try {
      const maBenhNhan = String(req.params.maBenhNhan || "");
      if (!maBenhNhan) throw new AppError(400, "Thiếu maBenhNhan");

      const card = await InsuranceService.updateByPatient(maBenhNhan, req.body || {});
      res.json({ bhyt: card });
    } catch (e) { next(e); }
  },

  // GET /patients/:maBenhNhan/insurance/has-valid
  async hasValid(req, res, next) {
    try {
      const maBenhNhan = String(req.params.maBenhNhan || "");
      if (!maBenhNhan) throw new AppError(400, "Thiếu maBenhNhan");
      const data = await InsuranceService.hasValidByPatient(maBenhNhan);
      res.json(data); // { hasValid: boolean }
    } catch (e) { next(e); }
  }
};
