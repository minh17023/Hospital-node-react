import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { InsuranceModel } from "./insurance.model.js";

export const InsuranceService = {
  // GET: lấy thẻ (hoặc null)
  async getByPatient(idBenhNhan) {
    return InsuranceModel.getByPatient(idBenhNhan);
  },

  // POST: tạo mới (nếu đã có → 409). Sync BenhNhan.soBHYT
  async createOne(idBenhNhan, { soThe, denNgay, trangThai = 1 }) {
    const existed = await InsuranceModel.getByPatient(idBenhNhan);
    if (existed) throw new AppError(409, "Bệnh nhân đã có thẻ BHYT");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rs] = await conn.query(
        `INSERT INTO BaoHiemYTe (idBenhNhan, soThe, denNgay, trangThai, ngayTao)
         VALUES (?, ?, ?, ?, NOW())`,
        [idBenhNhan, soThe, denNgay, trangThai]
      );

      await conn.query(
        `UPDATE BenhNhan SET soBHYT=? WHERE idBenhNhan=?`,
        [soThe, idBenhNhan]
      );

      await conn.commit();
      return await InsuranceModel.getByPatient(idBenhNhan);
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

  // PUT: cập nhật thẻ hiện có. Nếu đổi số thẻ, sync BenhNhan.soBHYT
  async updateByPatient(idBenhNhan, patch) {
    const existed = await InsuranceModel.getByPatient(idBenhNhan);
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
        vals.push(idBenhNhan);
        await conn.query(
          `UPDATE BaoHiemYTe SET ${sets.join(", ")} WHERE idBenhNhan=?`,
          vals
        );
      }

      // nếu thay đổi soThe → sync BenhNhan.soBHYT
      if (patch.soThe !== undefined && patch.soThe !== existed.soThe) {
        await conn.query(
          `UPDATE BenhNhan SET soBHYT=? WHERE idBenhNhan=?`,
          [patch.soThe, idBenhNhan]
        );
      }

      await conn.commit();
      return await InsuranceModel.getByPatient(idBenhNhan);
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  },

  // GET: boolean hasValid
  async hasValidByPatient(idBenhNhan) {
    const hasValid = await InsuranceModel.hasValidByPatient(idBenhNhan);
    return { hasValid };
  }
};
