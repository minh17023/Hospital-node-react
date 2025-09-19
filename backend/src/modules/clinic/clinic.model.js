import { pool } from "../../config/db.js";

export const ClinicModel = {
  async findById(idPhongKham) {
    const [rows] = await pool.query(
      `SELECT * FROM PhongKham WHERE idPhongKham=? LIMIT 1`,
      [idPhongKham]
    );
    return rows[0] || null;
  },

  async list({ q=null, idChuyenKhoa=null, trangThai=null, offset=0, limit=50 }) {
    const where = [];
    const params = [];

    if (q) { where.push(`tenPhongKham LIKE ?`); params.push(`%${q}%`); }
    if (idChuyenKhoa) { where.push(`idChuyenKhoa=?`); params.push(Number(idChuyenKhoa)); }
    if (trangThai !== null && trangThai !== undefined && trangThai !== "") {
      where.push(`trangThai=?`); params.push(Number(trangThai));
    }

    const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `
      SELECT *
      FROM PhongKham
      ${sqlWhere}
      ORDER BY idPhongKham DESC
      LIMIT ?, ?`;
    params.push(Number(offset), Number(limit));

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async count({ q=null, idChuyenKhoa=null, trangThai=null }) {
    const where = [];
    const params = [];
    if (q) { where.push(`tenPhongKham LIKE ?`); params.push(`%${q}%`); }
    if (idChuyenKhoa) { where.push(`idChuyenKhoa=?`); params.push(Number(idChuyenKhoa)); }
    if (trangThai !== null && trangThai !== undefined && trangThai !== "") {
      where.push(`trangThai=?`); params.push(Number(trangThai));
    }
    const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [rows] = await pool.query(`SELECT COUNT(*) as total FROM PhongKham ${sqlWhere}`, params);
    return rows[0]?.total ?? 0;
  },

  async create(data) {
    const {
      tenPhongKham, idChuyenKhoa,
      tang = null, dienTich = null, sucChua = null,
      trangBi = null, ghiChu = null, trangThai = 1
    } = data;

    const [rs] = await pool.query(
      `INSERT INTO PhongKham
        (tenPhongKham, idChuyenKhoa, tang, dienTich, sucChua, trangBi, ghiChu, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenPhongKham, idChuyenKhoa,
        tang, dienTich, sucChua,
        trangBi, ghiChu, trangThai
      ]
    );
    return rs.insertId;
  },

  async update(idPhongKham, patch) {
    const allow = [
      "tenPhongKham","idChuyenKhoa","tang","dienTich","sucChua",
      "trangBi","ghiChu","trangThai"
    ];
    const fields = [];
    const values = [];
    for (const k of allow) {
      if (patch[k] !== undefined) { fields.push(`${k}=?`); values.push(patch[k]); }
    }
    if (!fields.length) return 0;
    values.push(idPhongKham);
    const [rs] = await pool.query(
      `UPDATE PhongKham SET ${fields.join(", ")} WHERE idPhongKham=?`,
      values
    );
    return rs.affectedRows;
  },

  async remove(idPhongKham) {
    const [rs] = await pool.query(
      `DELETE FROM PhongKham WHERE idPhongKham=?`,
      [idPhongKham]
    );
    return rs.affectedRows;
  },
};
