import { DoctorModel } from "./doctor.model.js";
import { AppError } from "../../core/http/error.js";

export const DoctorService = {
  async create(payload) {
    // kiểm tra các field bắt buộc
    for (const k of ["maUser", "maChuyenKhoa", "tenBacSi"]) {
      if (!payload?.[k]) throw new AppError(400, `Thiếu ${k}`);
    }
    const created = await DoctorModel.create(payload);
    return created; // đã có maBacSi trong object trả về
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
