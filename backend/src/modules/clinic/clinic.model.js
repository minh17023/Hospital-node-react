import { pool } from "../../config/db.js";

export const ClinicModel = {
  async findByMa(maPhongKham) {
    const [rows] = await pool.query(
      `SELECT * FROM phongkham WHERE maPhongKham=? LIMIT 1`,
      [maPhongKham]
    );
    return rows[0] || null;
  },

  async list({ q=null, maChuyenKhoa=null, trangThai=null, offset=0, limit=50 }) {
    const where = [];
    const params = [];

    if (q) { where.push(`tenPhongKham LIKE ?`); params.push(`%${q}%`); }
    if (maChuyenKhoa) { where.push(`maChuyenKhoa=?`); params.push(String(maChuyenKhoa)); }
    if (trangThai !== null && trangThai !== undefined && trangThai !== "") {
      where.push(`trangThai=?`); params.push(Number(trangThai));
    }

    const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `
      SELECT *
      FROM phongkham
      ${sqlWhere}
      ORDER BY maPhongKham DESC
      LIMIT ?, ?`;
    params.push(Number(offset), Number(limit));

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async count({ q=null, maChuyenKhoa=null, trangThai=null }) {
    const where = [];
    const params = [];
    if (q) { where.push(`tenPhongKham LIKE ?`); params.push(`%${q}%`); }
    if (maChuyenKhoa) { where.push(`maChuyenKhoa=?`); params.push(String(maChuyenKhoa)); }
    if (trangThai !== null && trangThai !== undefined && trangThai !== "") {
      where.push(`trangThai=?`); params.push(Number(trangThai));
    }
    const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [rows] = await pool.query(`SELECT COUNT(*) as total FROM phongkham ${sqlWhere}`, params);
    return rows[0]?.total ?? 0;
  },

  async create(data) {
    const {
      tenPhongKham, maChuyenKhoa = null,
      tang = null, dienTich = null, sucChua = null,
      trangBi = null, ghiChu = null, trangThai = 1
    } = data;

    // Trigger sẽ sinh maPhongKham
    await pool.query(
      `INSERT INTO phongkham
        (tenPhongKham, maChuyenKhoa, tang, dienTich, sucChua, trangBi, ghiChu, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenPhongKham, maChuyenKhoa,
        tang, dienTich, sucChua,
        trangBi, ghiChu, trangThai
      ]
    );

    // Lấy lại bản ghi mới nhất theo tên (giả định tạo không trùng tên đồng thời)
    const [rows] = await pool.query(
      `SELECT * FROM phongkham
       WHERE tenPhongKham=? 
       ORDER BY maPhongKham DESC
       LIMIT 1`,
      [tenPhongKham]
    );
    return rows[0] || null;
  },

  async update(maPhongKham, patch) {
    const allow = [
      "tenPhongKham","maChuyenKhoa","tang","dienTich","sucChua",
      "trangBi","ghiChu","trangThai"
    ];
    const fields = [];
    const values = [];
    for (const k of allow) {
      if (patch[k] !== undefined) { fields.push(`${k}=?`); values.push(patch[k]); }
    }
    if (!fields.length) return 0;
    values.push(maPhongKham);
    const [rs] = await pool.query(
      `UPDATE phongkham SET ${fields.join(", ")} WHERE maPhongKham=?`,
      values
    );
    return rs.affectedRows;
  },

  async remove(maPhongKham) {
    const [rs] = await pool.query(
      `DELETE FROM phongkham WHERE maPhongKham=?`,
      [maPhongKham]
    );
    return rs.affectedRows;
  },
};
