import { pool } from "../../config/db.js";

export const SpecialtyModel = {
  // Danh sách + thống kê gọn
  async listWithStats() {
    const [rows] = await pool.query(`
      SELECT
        ck.idChuyenKhoa,
        ck.tenChuyenKhoa,
        ck.moTa,
        ck.phongKham,
        ck.trangThai,
        COUNT(bs.idBacSi)                           AS soBacSi,
        MIN(bs.phiKham)                             AS phiKham,                 -- map trực tiếp
        ROUND(AVG(bs.thoiGianKhamBinhQuan))         AS thoiGianKhamBinhQuan     -- map trực tiếp
      FROM ChuyenKhoa ck
      LEFT JOIN BacSi bs
        ON bs.idChuyenKhoa = ck.idChuyenKhoa
       AND (bs.trangThai IS NULL OR bs.trangThai = 1)
      WHERE (ck.trangThai IS NULL OR ck.trangThai = 1)
      GROUP BY ck.idChuyenKhoa
      ORDER BY ck.tenChuyenKhoa;
    `);
    return rows;
  },

  // Thống kê gọn theo id
  async statsById(idChuyenKhoa) {
    const [rows] = await pool.query(`
      SELECT
        ck.idChuyenKhoa,
        ck.tenChuyenKhoa,
        ck.moTa,
        ck.phongKham,
        ck.trangThai,
        COUNT(bs.idBacSi)                           AS soBacSi,
        MIN(bs.phiKham)                             AS phiKham,
        ROUND(AVG(bs.thoiGianKhamBinhQuan))         AS thoiGianKhamBinhQuan
      FROM ChuyenKhoa ck
      LEFT JOIN BacSi bs
        ON bs.idChuyenKhoa = ck.idChuyenKhoa
       AND (bs.trangThai IS NULL OR bs.trangThai = 1)
      WHERE ck.idChuyenKhoa=?
      GROUP BY ck.idChuyenKhoa
      LIMIT 1;
    `, [idChuyenKhoa]);
    return rows[0] || null;
  },

  // CRUD cho Admin
  async create(payload) {
    const { tenChuyenKhoa, moTa = null, truongKhoa = null, phongKham = null, trangThai = 1 } = payload;
    const [rs] = await pool.query(
      `INSERT INTO ChuyenKhoa (tenChuyenKhoa, moTa, truongKhoa, phongKham, trangThai) VALUES (?,?,?,?,?)`,
      [tenChuyenKhoa, moTa, truongKhoa, phongKham, trangThai]
    );
    return rs.insertId;
  },

  async getById(idChuyenKhoa) {
    const [rows] = await pool.query(
      `SELECT * FROM ChuyenKhoa WHERE idChuyenKhoa=? LIMIT 1`,
      [idChuyenKhoa]
    );
    return rows[0] || null;
  },

  async update(idChuyenKhoa, patch) {
    const allow = ["tenChuyenKhoa","moTa","truongKhoa","phongKham","trangThai"];
    const sets = [], vals = [];
    for (const k of allow) {
      if (patch[k] !== undefined) { sets.push(`${k}=?`); vals.push(patch[k]); }
    }
    if (!sets.length) return 0;
    vals.push(idChuyenKhoa);
    const [rs] = await pool.query(`UPDATE ChuyenKhoa SET ${sets.join(", ")} WHERE idChuyenKhoa=?`, vals);
    return rs.affectedRows;
  },

  async remove(idChuyenKhoa) {
    const [rs] = await pool.query(`DELETE FROM ChuyenKhoa WHERE idChuyenKhoa=?`, [idChuyenKhoa]);
    return rs.affectedRows;
  }
};
