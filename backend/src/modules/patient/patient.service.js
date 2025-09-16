import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { PatientModel } from "./patient.model.js";

export const PatientService = {
  // chỉ tạo BenhNhan — KHÔNG tạo BHYT ở luồng này
  async registerFull(payload) {
    for (const k of ["hoTen","soCCCD","ngaySinh","gioiTinh"]) {
      if (!payload?.[k]) throw new AppError(400, `Thiếu ${k}`);
    }
    if (!["M","F"].includes(payload.gioiTinh))
      throw new AppError(400, "gioiTinh phải là 'M' hoặc 'F'");
    if (String(payload.soCCCD).length > 12)
      throw new AppError(400, "soCCCD tối đa 12 ký tự");

    // người tạo: lấy từ payload, rút gọn 50 ký tự
    payload.nguoiTao = (payload.nguoiTao || "api").toString().slice(0, 50);

    // CCCD trùng?
    const existed = await PatientModel.findByCCCD(payload.soCCCD);
    if (existed) throw new AppError(409, "CCCD đã tồn tại");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const idBenhNhan = await PatientModel.create({ ...payload, soBHYT: null }, conn);
      await conn.commit();
      return await PatientModel.findById(idBenhNhan);
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  },

  async updateProfile(idBenhNhan, patch) {
    const changed = await PatientModel.update(idBenhNhan, patch);
    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return await PatientModel.findById(idBenhNhan);
  }
};
