import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { InsuranceModel } from "./insurance.model.js";

export const InsuranceService = {
  // thêm thẻ mới và đặt làm thẻ hiện hành (deactivate thẻ cũ + sync BenhNhan.soBHYT)
  async addCardAndSetActive(idBenhNhan, { soThe, denNgay, trangThai = 1 }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) vô hiệu hoá các thẻ cũ nếu bạn muốn chỉ có 1 thẻ active
      await conn.query(`UPDATE BaoHiemYTe SET trangThai=0 WHERE idBenhNhan=?`, [idBenhNhan]);

      // 2) thêm thẻ mới
      await InsuranceModel.create({ idBenhNhan, soThe, denNgay, trangThai }, conn);

      // 3) đồng bộ số thẻ hiện hành trên BenhNhan
      await conn.query(`UPDATE BenhNhan SET soBHYT=? WHERE idBenhNhan=?`, [soThe, idBenhNhan]);

      await conn.commit();
      return await InsuranceModel.listByPatient(idBenhNhan);
    } catch (e) {
      try { await conn.rollback(); } catch {}
      if (e?.code === "ER_DUP_ENTRY") throw new AppError(409, "Số thẻ BHYT đã tồn tại");
      throw e;
    } finally { conn.release(); }
  },

  // cập nhật thẻ; nếu setActive=true → đặt làm thẻ hiện hành và sync soBHYT
  async updateCard(idBHYT, patch, { setActive = false } = {}) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const card = await InsuranceModel.findById(idBHYT);
      if (!card) throw new AppError(404, "Không tìm thấy thẻ BHYT");

      if (Object.keys(patch || {}).length) {
        await InsuranceModel.update(idBHYT, patch);
      }

      if (setActive) {
        await conn.query(`UPDATE BaoHiemYTe SET trangThai=0 WHERE idBenhNhan=?`, [card.idBenhNhan]);
        await conn.query(`UPDATE BaoHiemYTe SET trangThai=1 WHERE idBHYT=?`, [idBHYT]);
        await conn.query(`UPDATE BenhNhan SET soBHYT=? WHERE idBenhNhan=?`, [card.soThe, card.idBenhNhan]);
      }

      await conn.commit();
      return await InsuranceModel.listByPatient(card.idBenhNhan);
    } catch (e) {
      try { await conn.rollback(); } catch {}
      if (e?.code === "ER_DUP_ENTRY") throw new AppError(409, "Số thẻ BHYT đã tồn tại");
      throw e;
    } finally { conn.release(); }
  }
};
