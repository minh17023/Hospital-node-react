import { AppError } from "../../core/http/error.js";
import { InsuranceService } from "./insurance.service.js";
import { InsuranceModel } from "./insurance.model.js";

export const InsuranceController = {
  // POST /patients/:idBenhNhan/bhyt
  async addCard(req, res, next) {
    try {
      const id = Number(req.params.idBenhNhan);
      const { soThe, denNgay, trangThai = 1 } = req.body || {};
      if (!id || !soThe || !denNgay) throw new AppError(400, "Thiếu id/soThe/denNgay");

      const list = await InsuranceService.addCardAndSetActive(id, { soThe, denNgay, trangThai });
      res.status(201).json({ bhyt: list });
    } catch (e) { next(e); }
  },

  // PATCH /insurance/cards/:idBHYT?setActive=true
  async updateCard(req, res, next) {
    try {
      const idBHYT = Number(req.params.idBHYT);
      const setActive = String(req.query.setActive || "false") === "true";
      const list = await InsuranceService.updateCard(idBHYT, req.body || {}, { setActive });
      res.json({ bhyt: list });
    } catch (e) { next(e); }
  },

  // GET /patients/:idBenhNhan/bhyt
  async listByPatient(req, res, next) {
    try {
      const id = Number(req.params.idBenhNhan);
      const list = await InsuranceModel.listByPatient(id);
      res.json({ bhyt: list });
    } catch (e) { next(e); }
  }
};
