import { DoctorModel } from "./doctor.model.js";
import { AppError } from "../../core/http/error.js";

export const DoctorService = {
  async create(payload) {
    for (const k of ["maNhanVien", "maChuyenKhoa"]) {
      if (!payload?.[k]) throw new AppError(400, `Thiếu ${k}`);
    }
    try {
      return await DoctorModel.create(payload);
    } catch (e) {
      if (e.code === "VALIDATION") throw new AppError(400, e.message);
      if (e.code === "NOT_FOUND") throw new AppError(404, e.message);
      if (e.code === "DUPLICATE") throw new AppError(409, e.message);
      throw e;
    }
  },

  getByMa: (ma) => DoctorModel.findByMa(ma),

  list: (query) => DoctorModel.list({
    maChuyenKhoa: query.maChuyenKhoa ?? null,
    q: query.q ?? "",
    trangThai: query.trangThai ?? null,
    feeMin: query.feeMin ?? null,
    feeMax: query.feeMax ?? null,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  }),

  listBySpecialty: (maChuyenKhoa, opts) =>
    DoctorModel.listBySpecialty(maChuyenKhoa, opts),

  async update(maBacSi, patch) {
    const changed = await DoctorModel.update(maBacSi, patch);
    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return await DoctorModel.findByMa(maBacSi);
  },

  async remove(maBacSi) {
    const ok = await DoctorModel.remove(maBacSi);
    if (!ok) throw new AppError(404, "Không tìm thấy bác sĩ");
    return true;
  },
};
