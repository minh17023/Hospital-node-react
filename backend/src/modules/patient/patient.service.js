import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { PatientModel } from "./patient.model.js";

export const PatientService = {
  // Đăng ký đầy đủ hồ sơ BenhNhan
  async registerFull(payload) {
    for (const k of ["hoTen","soCCCD","ngaySinh","gioiTinh"]) {
      if (!payload?.[k]) throw new AppError(400, `Thiếu ${k}`);
    }
    const existed = await PatientModel.findByCCCD(payload.soCCCD);
    if (existed) throw new AppError(409, "CCCD đã tồn tại");
  
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await PatientModel.create({ ...payload, soBHYT: null }, conn);
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  
    // ⛳️ LẤY LẠI THEO CCCD (trả về có maBenhNhan)
    return await PatientModel.findByCCCD(payload.soCCCD);
  },

  list: (query) => PatientModel.list({
    q: query.q ?? "",
    trangThai: query.trangThai ?? null,
    from: query.from ?? null,
    to: query.to ?? null,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
    orderBy: query.orderBy ?? "maBenhNhan",
    order: query.order ?? "DESC",
  }),

  async updateProfile(maBenhNhan, patch) {
    const changed = await PatientModel.update(maBenhNhan, patch);
    if (!changed) throw new AppError(400, "Không có trường hợp lệ để cập nhật");
    return await PatientModel.findByMa(maBenhNhan);
  },

  async deleteProfile(maBenhNhan) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Xóa các bản ghi phụ thuộc trước
      await conn.query(
        "DELETE FROM BaoHiemYTe WHERE maBenhNhan = ?",
        [maBenhNhan]
      );

      // 2) Xóa hồ sơ bệnh nhân
      const [rs] = await conn.query(
        "DELETE FROM BenhNhan WHERE maBenhNhan = ?",
        [maBenhNhan]
      );

      if (!rs.affectedRows) {
        // không xóa được => rollback
        await conn.rollback();
        return false;
      }

      await conn.commit();
      return true;
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  }
};
