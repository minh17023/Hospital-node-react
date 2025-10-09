import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { InsuranceModel } from "./insurance.model.js";

export const InsuranceService = {
  // GET: lấy thẻ (hoặc null)
  async getByPatient(maBenhNhan) {
    return InsuranceModel.getByPatient(maBenhNhan);
  },

  // POST: tạo mới (nếu đã có → 409). Sync benhnhan.soBHYT
  async createOne(maBenhNhan, { soThe, denNgay, trangThai = 1 }) {
    const existed = await InsuranceModel.getByPatient(maBenhNhan);
    if (existed) throw new AppError(409, "Bệnh nhân đã có thẻ BHYT");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO baohiemyte (maBenhNhan, soThe, denNgay, trangThai, ngayTao)
         VALUES (?, ?, ?, ?, NOW())`,
        [maBenhNhan, soThe, denNgay, trangThai]
      );

      await conn.query(
        `UPDATE benhnhan SET soBHYT=? WHERE maBenhNhan=?`,
        [soThe, maBenhNhan]
      );

      await conn.commit();
      return await InsuranceModel.getByPatient(maBenhNhan);
    } catch (e) {
      try { await conn.rollback(); } catch {}
      if (e?.code === "ER_DUP_ENTRY") {
        throw new AppError(409, "Bệnh nhân đã có thẻ BHYT");
      }
      throw e;
    } finally {
      conn.release();
    }
  },

  // PUT: cập nhật thẻ hiện có. Nếu đổi số thẻ, sync benhnhan.soBHYT
  async updateByPatient(maBenhNhan, patch) {
    const existed = await InsuranceModel.getByPatient(maBenhNhan);
    if (!existed) throw new AppError(404, "Chưa có thẻ BHYT để cập nhật");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // update bảng BHYT
      const allow = ["soThe", "denNgay", "trangThai"];
      const sets = [];
      const vals = [];
      for (const k of allow) {
        if (patch[k] !== undefined) { sets.push(`${k}=?`); vals.push(patch[k]); }
      }
      if (sets.length) {
        vals.push(maBenhNhan);
        await conn.query(
          `UPDATE baohiemyte SET ${sets.join(", ")} WHERE maBenhNhan=?`,
          vals
        );
      }

      // nếu thay đổi soThe → sync benhnhan.soBHYT
      if (patch.soThe !== undefined && patch.soThe !== existed.soThe) {
        await conn.query(
          `UPDATE benhnhan SET soBHYT=? WHERE maBenhNhan=?`,
          [patch.soThe, maBenhNhan]
        );
      }

      await conn.commit();
      return await InsuranceModel.getByPatient(maBenhNhan);
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  },

  // GET: boolean hasValid
  async hasValidByPatient(maBenhNhan) {
    const hasValid = await InsuranceModel.hasValidByPatient(maBenhNhan);
    return { hasValid };
  }
};
