import { SpecialtyModel } from "./specialty.model.js";
import { AppError } from "../../core/http/error.js";

export const SpecialtyService = {
  async list() {
    const rows = await SpecialtyModel.listWithStats();
    // Trả đúng tên field FE cần
    return rows.map(r => ({
      idChuyenKhoa: r.idChuyenKhoa,
      tenChuyenKhoa: r.tenChuyenKhoa,
      moTa: r.moTa,
      phongKham: r.phongKham,
      phiKham: r.phiKham ?? null,
      thoiGianKhamBinhQuan: r.thoiGianKhamBinhQuan ?? null,
      soBacSi: Number(r.soBacSi) || 0,
      trangThai: r.trangThai
    }));
  },

  async detail(id) {
    const r = await SpecialtyModel.statsById(id);
    if (!r) throw new AppError(404, "Không tìm thấy chuyên khoa");
    return {
      idChuyenKhoa: r.idChuyenKhoa,
      tenChuyenKhoa: r.tenChuyenKhoa,
      moTa: r.moTa,
      phongKham: r.phongKham,
      phiKham: r.phiKham ?? null,
      thoiGianKhamBinhQuan: r.thoiGianKhamBinhQuan ?? null,
      soBacSi: Number(r.soBacSi) || 0,
      trangThai: r.trangThai
    };
  },

  async create(payload) {
    if (!payload?.tenChuyenKhoa) throw new AppError(400, "Thiếu tenChuyenKhoa");
    const id = await SpecialtyModel.create(payload);
    return await SpecialtyModel.getById(id);
  },

  async update(id, patch) {
    const changed = await SpecialtyModel.update(id, patch);
    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return await SpecialtyModel.getById(id);
  },

  async remove(id) {
    const ok = await SpecialtyModel.remove(id);
    if (!ok) throw new AppError(404, "Không tìm thấy chuyên khoa để xoá");
    return true;
  }
};
