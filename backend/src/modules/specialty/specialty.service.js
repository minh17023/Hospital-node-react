import { SpecialtyModel } from "./specialty.model.js";
import { AppError } from "../../core/http/error.js";

export const SpecialtyService = {
  async list() {
    const rows = await SpecialtyModel.listWithStats();
    return rows.map(r => ({
      maChuyenKhoa: r.maChuyenKhoa,
      tenChuyenKhoa: r.tenChuyenKhoa,
      moTa: r.moTa,
      phongKham: r.phongKham,
      phiKham: r.phiKham ?? null,
      thoiGianKhamBinhQuan: r.thoiGianKhamBinhQuan ?? null,
      soBacSi: Number(r.soBacSi) || 0,
      trangThai: r.trangThai
    }));
  },

  async detail(ma) {
    const r = await SpecialtyModel.statsByMa(ma);
    if (!r) throw new AppError(404, "Không tìm thấy chuyên khoa");
    return {
      maChuyenKhoa: r.maChuyenKhoa,
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
    const created = await SpecialtyModel.create(payload);
    return created;
  },

  async update(ma, patch) {
    const changed = await SpecialtyModel.update(ma, patch);
    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return await SpecialtyModel.getByMa(ma);
  },

  async remove(ma) {
    const ok = await SpecialtyModel.remove(ma);
    if (!ok) throw new AppError(404, "Không tìm thấy chuyên khoa để xoá");
    return true;
  }
};
