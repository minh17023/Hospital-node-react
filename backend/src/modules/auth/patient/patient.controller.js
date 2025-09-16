import { AppError } from "../../../core/http/error.js";
import { signAccessToken } from "../../../core/utils/jwt.js";
import { PatientService } from "../../patient/patient.service.js";
import { PatientModel } from "../../patient/patient.model.js";

export const PatientAuthController = {
  // ĐĂNG KÝ: chỉ tạo BenhNhan, cho phép nhập nguoiTao
  async register(req, res, next) {
    try {
      const nguoiTaoFromBody = (req.body?.nguoiTao || "").trim();
      const nguoiTao =
        (nguoiTaoFromBody && nguoiTaoFromBody.slice(0, 50)) ||
        (req.user?.username && String(req.user.username).slice(0, 50)) ||
        "api";

      const patient = await PatientService.registerFull({ ...req.body, nguoiTao });

      // phát token tiện dùng ngay
      const payload = { idBenhNhan: patient.idBenhNhan, soCCCD: patient.soCCCD, role: "PATIENT" };
      const accessToken = signAccessToken(payload);
      res.status(201).json({ accessToken, patient });
    } catch (e) { next(e); }
  },

  // ĐĂNG NHẬP: CCCD
  async login(req, res, next) {
    try {
      const { cccd } = req.body || {};
      if (!cccd) throw new AppError(400, "Thiếu CCCD");
      const bn = await PatientModel.findByCCCD(cccd);
      if (!bn) throw new AppError(404, "Chưa có hồ sơ, cần đăng ký");

      const payload = { idBenhNhan: bn.idBenhNhan, soCCCD: bn.soCCCD, role: "PATIENT" };
      const accessToken = signAccessToken(payload);
      res.json({ accessToken, patient: bn });
    } catch (e) { next(e); }
  },

  // ME: trả hồ sơ + danh sách BHYT, kèm thẻ hiện hành (nếu có)
  async me(req, res, next) {
    try {
      const { idBenhNhan, soCCCD } = req.user || {};
      if (!idBenhNhan && !soCCCD) throw new AppError(401, "Chưa đăng nhập");

      const patient = idBenhNhan
        ? await PatientModel.findById(idBenhNhan)
        : await PatientModel.findByCCCD(soCCCD);
      if (!patient) throw new AppError(404, "Không tìm thấy hồ sơ");

      const bhyt = await PatientModel.listBHYT(patient.idBenhNhan);
      const today = new Date().toISOString().slice(0,10);
      const bhytHienHanh =
        bhyt.find(x => x.soThe === patient.soBHYT) ||
        bhyt.find(x => x.trangThai === 1 && String(x.denNgay) >= today) || null;

      res.json({ patient, bhyt, bhytHienHanh });
    } catch (e) { next(e); }
  }
};
