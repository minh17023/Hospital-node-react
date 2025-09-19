import { AppError } from "../../core/http/error.js";
import { PatientService } from "./patient.service.js";
import { PatientModel } from "./patient.model.js";

export const PatientController = {
  // GET /api/v1/patients/me
  async me(req, res, next) {
    try {
      const { idBenhNhan, cccd, soCCCD } = req.user || {};
      if (!idBenhNhan && !(cccd || soCCCD)) throw new AppError(401, "Chưa đăng nhập");

      const patient = idBenhNhan
        ? await PatientModel.findById(idBenhNhan)
        : await PatientModel.findByCCCD(cccd || soCCCD);

      if (!patient) throw new AppError(404, "Không tìm thấy hồ sơ");

      const bhyt = await PatientModel.listBHYT(patient.idBenhNhan);
      const today = new Date().toISOString().slice(0, 10);

      const bhytHienHanh =
        bhyt.find(x => x.soThe === patient.soBHYT) ||
        bhyt.find(x => x.trangThai === 1 && String(x.denNgay) >= today) || null;

      res.json({ patient, bhyt, bhytHienHanh });
    } catch (e) { next(e); }
  },

  // GET /api/v1/patients/:idBenhNhan
  async getOne(req, res, next) {
    try {
      const id = Number(req.params.idBenhNhan);
      const patient = await PatientModel.findById(id);
      if (!patient) throw new AppError(404, "Không tìm thấy hồ sơ");
      res.json({ patient });
    } catch (e) { next(e); }
  },

  // PUT /api/v1/patients/:idBenhNhan
  async update(req, res, next) {
    try {
      const id = Number(req.params.idBenhNhan);
      const patch = req.body || {};
      const updated = await PatientService.updateProfile(id, patch);
      res.json({ patient: updated });
    } catch (e) { next(e); }
  },

  // DELETE /api/v1/patients/:idBenhNhan  (ADMIN)
  async remove(req, res, next) {
    try {
      const id = Number(req.params.idBenhNhan);
      const exists = await PatientModel.findById(id);
      if (!exists) throw new AppError(404, "Không tìm thấy hồ sơ");
      const ok = await PatientService.deleteProfile(id);
      res.json({ deleted: ok });
    } catch (e) { next(e); }
  },
};
