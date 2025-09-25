// src/modules/doctor/doctor.service.js
import { DoctorModel } from "./doctor.model.js";
import { AppError } from "../../core/http/error.js";

export const DoctorService = {
  async create(payload) {
    // kiểm tra các field bắt buộc
    for (const k of ["idUser", "idChuyenKhoa", "tenBacSi"]) {
      if (!payload?.[k]) throw new AppError(400, `Thiếu ${k}`);
    }
    const idBacSi = await DoctorModel.create(payload);
    return await DoctorModel.findById(idBacSi);
  },

  getById: (id) => DoctorModel.findById(id),

  list: (query) => DoctorModel.list(query),

  listBySpecialty: (idChuyenKhoa, opts) =>
    DoctorModel.listBySpecialty(idChuyenKhoa, opts),

  async update(idBacSi, patch) {
    const changed = await DoctorModel.update(idBacSi, patch);
    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return await DoctorModel.findById(idBacSi);
  },

  async remove(idBacSi) {
    const ok = await DoctorModel.remove(idBacSi);
    if (!ok) throw new AppError(404, "Không tìm thấy bác sĩ");
    return true;
  },
};
