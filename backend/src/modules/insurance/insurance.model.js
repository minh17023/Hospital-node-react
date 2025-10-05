import { pool } from "../../config/db.js";

export const InsuranceModel = {
  // Lấy thẻ BHYT (1-1 theo bệnh nhân)
  async getByPatient(maBenhNhan) {
    const [rows] = await pool.query(
      `SELECT * FROM BaoHiemYTe WHERE maBenhNhan=? LIMIT 1`,
      [maBenhNhan]
    );
    return rows[0] || null;
  },

  // Tạo thẻ mới (DB sẽ tự sinh maBHYT)
  async createOne({ maBenhNhan, soThe, denNgay, trangThai = 1 }) {
    await pool.query(
      `INSERT INTO BaoHiemYTe (maBenhNhan, soThe, denNgay, trangThai, ngayTao)
       VALUES (?, ?, ?, ?, NOW())`,
      [maBenhNhan, soThe, denNgay, trangThai]
    );
    // 1-1 theo BN nên reselect theo bệnh nhân
    return await this.getByPatient(maBenhNhan);
  },

  // Cập nhật thẻ theo maBenhNhan (vì 1-1)
  async updateByPatient(maBenhNhan, patch) {
    const allow = ["soThe", "denNgay", "trangThai"];
    const sets = [];
    const vals = [];
    for (const k of allow) {
      if (patch[k] !== undefined) { sets.push(`${k}=?`); vals.push(patch[k]); }
    }
    if (!sets.length) return 0;
    vals.push(maBenhNhan);
    const [rs] = await pool.query(
      `UPDATE BaoHiemYTe SET ${sets.join(", ")} WHERE maBenhNhan=?`,
      vals
    );
    return rs.affectedRows;
  },

  // Boolean: có thẻ còn hạn và đang active?
  async hasValidByPatient(maBenhNhan) {
    const [rows] = await pool.query(
      `SELECT 1
         FROM BaoHiemYTe
        WHERE maBenhNhan=?
          AND trangThai=1
          AND DATE(denNgay) >= CURDATE()
        LIMIT 1`,
      [maBenhNhan]
    );
    return !!rows.length;
  }
};
