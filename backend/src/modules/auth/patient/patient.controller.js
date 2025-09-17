// backend/src/modules/auth/patient.controller.js
import { AppError } from "../../../core/http/error.js";
import {
  signPatientAccessToken,
  signPatientRefreshToken,
} from "../../../core/utils/jwt.js";
import { PatientService } from "../../patient/patient.service.js";
import { PatientModel } from "../../patient/patient.model.js";

export const PatientAuthController = {
  // ĐĂNG KÝ: tạo BenhNhan và cấp PATIENT token dùng ngay
  async register(req, res, next) {
    try {
      const nguoiTaoFromBody = (req.body?.nguoiTao || "").trim();
      const nguoiTao =
        (nguoiTaoFromBody && nguoiTaoFromBody.slice(0, 50)) ||
        (req.user?.username && String(req.user.username).slice(0, 50)) ||
        "api";

      const patient = await PatientService.registerFull({ ...req.body, nguoiTao });

      const accessToken = signPatientAccessToken(patient);      // <-- dùng HÀM BỆNH NHÂN
      const refreshToken = signPatientRefreshToken(patient);
      res.status(201).json({ accessToken, refreshToken, patient });
    } catch (e) { next(e); }
  },

  // ĐĂNG NHẬP: bằng CCCD
  async login(req, res, next) {
    try {
      const { soCCCD } = req.body || {};
      if (!soCCCD) throw new AppError(400, "Thiếu CCCD");

      // BUG cũ: dùng biến 'cccd' không tồn tại → luôn undefined
      const bn = await PatientModel.findByCCCD(soCCCD);
      if (!bn) throw new AppError(404, "Chưa có hồ sơ, cần đăng ký");

      const accessToken = signPatientAccessToken(bn);           // <-- PATIENT token
      const refreshToken = signPatientRefreshToken(bn);

      res.json({ accessToken, refreshToken, patient: bn });
    } catch (e) { next(e); }
  },

  // ME: trả hồ sơ + các thẻ BHYT
  async me(req, res, next) {
    try {
      const { idBenhNhan, soCCCD } = req.user || {};
      if (!idBenhNhan && !soCCCD) throw new AppError(401, "Chưa đăng nhập");

      const patient = idBenhNhan
        ? await PatientModel.findById(idBenhNhan)
        : await PatientModel.findByCCCD(soCCCD);

      if (!patient) throw new AppError(404, "Không tìm thấy hồ sơ");

      const bhyt = await PatientModel.listBHYT(patient.idBenhNhan);
      const today = new Date().toISOString().slice(0, 10);
      const bhytHienHanh =
        bhyt.find(x => x.soThe === patient.soBHYT) ||
        bhyt.find(x => x.trangThai === 1 && String(x.denNgay) >= today) || null;

      res.json({ patient, bhyt, bhytHienHanh });
    } catch (e) { next(e); }
  }
};
