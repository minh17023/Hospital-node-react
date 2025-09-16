import { pool } from "../../config/db.js";

export const InsuranceModel = {
  async listByPatient(idBenhNhan) {
    const [rows] = await pool.query(
      `SELECT * FROM BaoHiemYTe WHERE idBenhNhan=? ORDER BY idBHYT DESC`, [idBenhNhan]
    );
    return rows;
  },

  async findById(idBHYT) {
    const [rows] = await pool.query(`SELECT * FROM BaoHiemYTe WHERE idBHYT=?`, [idBHYT]);
    return rows[0] || null;
  },

  async create({ idBenhNhan, soThe, denNgay, trangThai=1 }, conn = pool) {
    const [rs] = await conn.query(
      `INSERT INTO BaoHiemYTe (idBenhNhan, soThe, denNgay, trangThai, ngayTao)
       VALUES (?, ?, ?, ?, NOW())`,
      [idBenhNhan, soThe, denNgay, trangThai]
    );
    return rs.insertId;
  },

  async update(idBHYT, patch) {
    const allow = ["soThe","denNgay","trangThai"];
    const fields=[], vals=[];
    for (const k of allow) if (patch[k] !== undefined) { fields.push(`${k}=?`); vals.push(patch[k]); }
    if (!fields.length) return 0;
    vals.push(idBHYT);
    const [rs] = await pool.query(`UPDATE BaoHiemYTe SET ${fields.join(", ")} WHERE idBHYT=?`, vals);
    return rs.affectedRows;
  }
};
