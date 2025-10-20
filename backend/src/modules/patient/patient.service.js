import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { PatientModel } from "./patient.model.js";

export const PatientService = {
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

      // 1) Xóa phụ thuộc
      await conn.query(
        "DELETE FROM baohiemyte WHERE maBenhNhan = ?",
        [maBenhNhan]
      );

      // 2) Xóa hồ sơ
      const [rs] = await conn.query(
        "DELETE FROM benhnhan WHERE maBenhNhan = ?",
        [maBenhNhan]
      );

      if (!rs.affectedRows) {
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
  },

  listByDoctor: (maBacSi, query = {}) =>
    PatientModel.listByDoctor(maBacSi, {
      q: query.q ?? "",
      from: query.from ?? null,
      to: query.to ?? null,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      orderBy: query.orderBy ?? "lastVisit",
      order: query.order ?? "DESC",
    }),
};
