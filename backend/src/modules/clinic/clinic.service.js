import { AppError } from "../../core/http/error.js";
import { ClinicModel } from "./clinic.model.js";

export const ClinicService = {
  async list(query) {
    const page  = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ClinicModel.list({
        q: query.q || null,
        idChuyenKhoa: query.idChuyenKhoa || null,
        trangThai: query.trangThai ?? null,
        offset, limit
      }),
      ClinicModel.count({
        q: query.q || null,
        idChuyenKhoa: query.idChuyenKhoa || null,
        trangThai: query.trangThai ?? null
      })
    ]);

    return { items, page, limit, total };
  },

  async listBySpecialty(idChuyenKhoa, query) {
    return ClinicModel.list({
      idChuyenKhoa,
      q: query.q || null,
      trangThai: query.trangThai ?? 1,
      offset: 0,
      limit: 1000
    });
  },

  async create(payload) {
    if (!payload?.tenPhongKham) throw new AppError(400, "Thiếu tenPhongKham");
    if (!payload?.idChuyenKhoa) throw new AppError(400, "Thiếu idChuyenKhoa");

    const id = await ClinicModel.create({
      tenPhongKham: String(payload.tenPhongKham).slice(0,100),
      idChuyenKhoa: Number(payload.idChuyenKhoa),
      tang: payload.tang != null ? Number(payload.tang) : null,
      dienTich: payload.dienTich != null ? Number(payload.dienTich) : null,
      sucChua: payload.sucChua != null ? Number(payload.sucChua) : null,
      trangBi: payload.trangBi ? String(payload.trangBi).slice(0,500) : null,
      ghiChu: payload.ghiChu ? String(payload.ghiChu).slice(0,255) : null,
      trangThai: payload.trangThai != null ? Number(payload.trangThai) : 1
    });

    return await ClinicModel.findById(id);
  },

  async update(idPhongKham, patch) {
    const existed = await ClinicModel.findById(idPhongKham);
    if (!existed) throw new AppError(404, "Không tìm thấy phòng khám");

    const changed = await ClinicModel.update(idPhongKham, {
      tenPhongKham: patch.tenPhongKham?.slice(0,100),
      idChuyenKhoa: patch.idChuyenKhoa != null ? Number(patch.idChuyenKhoa) : undefined,
      tang: patch.tang != null ? Number(patch.tang) : undefined,
      dienTich: patch.dienTich != null ? Number(patch.dienTich) : undefined,
      sucChua: patch.sucChua != null ? Number(patch.sucChua) : undefined,
      trangBi: patch.trangBi != null ? String(patch.trangBi).slice(0,500) : undefined,
      ghiChu: patch.ghiChu != null ? String(patch.ghiChu).slice(0,255) : undefined,
      trangThai: patch.trangThai != null ? Number(patch.trangThai) : undefined,
    });

    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return await ClinicModel.findById(idPhongKham);
  },

  async remove(idPhongKham) {
    const existed = await ClinicModel.findById(idPhongKham);
    if (!existed) throw new AppError(404, "Không tìm thấy phòng khám");
    await ClinicModel.remove(idPhongKham);
    return true;
  },
};
