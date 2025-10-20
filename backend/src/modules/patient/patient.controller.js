import { AppError } from "../../core/http/error.js";
import { PatientService } from "./patient.service.js";
import { PatientModel } from "./patient.model.js";
import { ROLES } from "../../core/auth/roles.js";

function isDoctor(user) {
  if (!user) return false;
  // Hỗ trợ cả kiểu string hoặc số
  return user.role === "DOCTOR" || user.role === ROLES?.DOCTOR || user.vaiTro === "DOCTOR";
}

export const PatientController = {
  // GET /api/v1/patients/me
  async me(req, res, next) {
    try {
      const { maBenhNhan, cccd, soCCCD } = req.user || {};
      if (!maBenhNhan && !(cccd || soCCCD)) throw new AppError(401, "Chưa đăng nhập");

      const patient = maBenhNhan
        ? await PatientModel.findByMa(maBenhNhan)
        : await PatientModel.findByCCCD(cccd || soCCCD);

      if (!patient) throw new AppError(404, "Không tìm thấy hồ sơ");

      const bhyt = await PatientModel.listBHYT(patient.maBenhNhan);
      const today = new Date().toISOString().slice(0, 10);

      const bhytHienHanh =
        bhyt.find(x => x.soThe === patient.soBHYT) ||
        bhyt.find(x => x.trangThai === 1 && String(x.denNgay) >= today) || null;

      res.json({ patient, bhyt, bhytHienHanh });
    } catch (e) { next(e); }
  },

  // GET /api/v1/patients/:maBenhNhan
  async getOne(req, res, next) {
    try {
      const ma = String(req.params.maBenhNhan || "");
      const patient = await PatientModel.findByMa(ma);
      if (!patient) throw new AppError(404, "Không tìm thấy hồ sơ");
      res.json({ patient });
    } catch (e) { next(e); }
  },

  // GET /api/v1/patients  (ADMIN|DOCTOR)
  async list(req, res, next) {
    try {
      const rs = await PatientService.list(req.query || {});
      res.json(rs); // { items, total }
    } catch (e) { next(e); }
  },

  // PUT /api/v1/patients/:maBenhNhan
  async update(req, res, next) {
    try {
      const ma = String(req.params.maBenhNhan || "");
      const patch = req.body || {};
      const updated = await PatientService.updateProfile(ma, patch);
      res.json({ patient: updated });
    } catch (e) { next(e); }
  },

  // DELETE /api/v1/patients/:maBenhNhan  (ADMIN)
  async remove(req, res, next) {
    try {
      const ma = String(req.params.maBenhNhan || "");
      const exists = await PatientModel.findByMa(ma);
      if (!exists) throw new AppError(404, "Không tìm thấy hồ sơ");

      const ok = await PatientService.deleteProfile(ma); 
      res.json({ deleted: ok });
    } catch (e) { next(e); }
  },

  /* ====== MỚI: GET /api/v1/doctors/:maBacSi/patients ====== */
  async listByDoctor(req, res, next) {
    try {
      const maBacSi = String(req.params.maBacSi || "");
      if (!maBacSi) throw new AppError(400, "Thiếu maBacSi");

      // Nếu là bác sĩ thì chỉ được xem bệnh nhân của chính mình
      const u = req.user || {};
      if (isDoctor(u) && u.maBacSi && u.maBacSi !== maBacSi) {
        throw new AppError(403, "Không được phép xem bệnh nhân của bác sĩ khác");
      }

      const rs = await PatientService.listByDoctor(maBacSi, req.query || {});
      res.json(rs); // { items, total }
    } catch (e) { next(e); }
  },
};
