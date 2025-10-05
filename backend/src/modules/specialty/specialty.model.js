import { pool } from "../../config/db.js";

export const SpecialtyModel = {
  // Danh sách + thống kê gọn
  async listWithStats() {
    const [rows] = await pool.query(`
      SELECT
        ck.maChuyenKhoa,
        ck.tenChuyenKhoa,
        ck.moTa,
        ck.phongKham,
        ck.trangThai,
        COUNT(bs.maBacSi)                    AS soBacSi,
        MIN(bs.phiKham)                      AS phiKham,
        ROUND(AVG(bs.thoiGianKhamBinhQuan))  AS thoiGianKhamBinhQuan
      FROM ChuyenKhoa ck
      LEFT JOIN BacSi bs
        ON bs.maChuyenKhoa = ck.maChuyenKhoa
       AND (bs.trangThai IS NULL OR bs.trangThai = 1)
      WHERE (ck.trangThai IS NULL OR ck.trangThai = 1)
      GROUP BY ck.maChuyenKhoa, ck.tenChuyenKhoa, ck.moTa, ck.phongKham, ck.trangThai
      ORDER BY ck.maChuyenKhoa ASC
    `);
    return rows;
  },

  // Thống kê gọn theo mã
  async statsByMa(maChuyenKhoa) {
    const [rows] = await pool.query(`
      SELECT
        ck.maChuyenKhoa,
        ck.tenChuyenKhoa,
        ck.moTa,
        ck.phongKham,
        ck.trangThai,
        COUNT(bs.maBacSi)                    AS soBacSi,
        MIN(bs.phiKham)                      AS phiKham,
        ROUND(AVG(bs.thoiGianKhamBinhQuan))  AS thoiGianKhamBinhQuan
      FROM ChuyenKhoa ck
      LEFT JOIN BacSi bs
        ON bs.maChuyenKhoa = ck.maChuyenKhoa
       AND (bs.trangThai IS NULL OR bs.trangThai = 1)
      WHERE ck.maChuyenKhoa = ?
      GROUP BY ck.maChuyenKhoa
      LIMIT 1
    `, [maChuyenKhoa]);
    return rows[0] || null;
  },

  // CRUD cho Admin
  async create(payload) {
    const { tenChuyenKhoa, moTa = null, truongKhoa = null, phongKham = null, trangThai = 1 } = payload;

    // Trigger DB sẽ sinh maChuyenKhoa
    await pool.query(
      `INSERT INTO ChuyenKhoa (tenChuyenKhoa, moTa, truongKhoa, phongKham, trangThai)
       VALUES (?,?,?,?,?)`,
      [tenChuyenKhoa, moTa, truongKhoa, phongKham, trangThai]
    );

    // Lấy lại record theo tên (giả định tên không “spam” cùng lúc)
    const [rows] = await pool.query(
      `SELECT * FROM ChuyenKhoa
        WHERE tenChuyenKhoa = ?
        ORDER BY maChuyenKhoa DESC
        LIMIT 1`,
      [tenChuyenKhoa]
    );
    return rows[0] || null;
  },

  async getByMa(maChuyenKhoa) {
    const [rows] = await pool.query(
      `SELECT * FROM ChuyenKhoa WHERE maChuyenKhoa=? LIMIT 1`,
      [maChuyenKhoa]
    );
    return rows[0] || null;
  },

  async update(maChuyenKhoa, patch) {
    const allow = ["tenChuyenKhoa","moTa","truongKhoa","phongKham","trangThai"];
    const sets = [], vals = [];
    for (const k of allow) {
      if (patch[k] !== undefined) { sets.push(`${k}=?`); vals.push(patch[k]); }
    }
    if (!sets.length) return 0;
    vals.push(maChuyenKhoa);
    const [rs] = await pool.query(
      `UPDATE ChuyenKhoa SET ${sets.join(", ")} WHERE maChuyenKhoa=?`,
      vals
    );
    return rs.affectedRows;
  },

  async remove(maChuyenKhoa) {
    const [rs] = await pool.query(
      `DELETE FROM ChuyenKhoa WHERE maChuyenKhoa=?`,
      [maChuyenKhoa]
    );
    return rs.affectedRows;
  }
};
