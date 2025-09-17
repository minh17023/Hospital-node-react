import { pool } from "../../config/db.js";

export const InsuranceModel = {
  // Lấy thẻ BHYT (vì 1-1, trả 1 bản ghi hoặc null)
  async getByPatient(idBenhNhan) {
    const [rows] = await pool.query(
      `SELECT * FROM BaoHiemYTe WHERE idBenhNhan=? LIMIT 1`,
      [idBenhNhan]
    );
    return rows[0] || null;
  },

  // Tạo thẻ mới
  async createOne({ idBenhNhan, soThe, denNgay, trangThai = 1 }) {
    const [rs] = await pool.query(
      `INSERT INTO BaoHiemYTe (idBenhNhan, soThe, denNgay, trangThai, ngayTao)
       VALUES (?, ?, ?, ?, NOW())`,
      [idBenhNhan, soThe, denNgay, trangThai]
    );
    return rs.insertId;
  },

  // Cập nhật thẻ theo idBenhNhan (vì 1-1)
  async updateByPatient(idBenhNhan, patch) {
    const allow = ["soThe", "denNgay", "trangThai"];
    const sets = [];
    const vals = [];
    for (const k of allow) {
      if (patch[k] !== undefined) { sets.push(`${k}=?`); vals.push(patch[k]); }
    }
    if (!sets.length) return 0;
    vals.push(idBenhNhan);
    const [rs] = await pool.query(
      `UPDATE BaoHiemYTe SET ${sets.join(", ")} WHERE idBenhNhan=?`,
      vals
    );
    return rs.affectedRows;
  },

  // Boolean: có thẻ còn hạn và đang active?
  async hasValidByPatient(idBenhNhan) {
    const [rows] = await pool.query(
      `SELECT 1
         FROM BaoHiemYTe
        WHERE idBenhNhan=?
          AND trangThai=1
          AND DATE(denNgay) >= CURDATE()
        LIMIT 1`,
      [idBenhNhan]
    );
    return !!rows.length;
  }
};
