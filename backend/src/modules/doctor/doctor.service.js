import { DoctorModel } from "./doctor.model.js";
import { AppError } from "../../core/http/error.js";

export const DoctorService = {
  async getById(id) {
    const item = await DoctorModel.findById(id);
    if (!item) throw new AppError(404, "Không tìm thấy bác sĩ");
    return item;
  },

  async list(query = {}) {
    const items = await DoctorModel.list(query);
    return { items, offset: Number(query.offset ?? 0), limit: Number(query.limit ?? 50) };
  },

  async listBySpecialty(idChuyenKhoa, query = {}) {
    const items = await DoctorModel.listBySpecialty(idChuyenKhoa, query);
    return { items, offset: Number(query.offset ?? 0), limit: Number(query.limit ?? 50) };
  },

  async update(id, patch) {
    const changed = await DoctorModel.update(id, patch);
    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return this.getById(id);
  },

  async remove(id) {
    const affected = await DoctorModel.remove(id);
    if (!affected) throw new AppError(404, "Không tìm thấy bác sĩ");
    return { deleted: true };
  },
};
