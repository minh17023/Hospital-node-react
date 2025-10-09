import { pool } from "../../config/db.js";

export const WorkshiftModel = {
  async list({ q = "", status = "ALL", limit = 50, offset = 0 }) {
    const where = [];
    const params = [];

    if (q) {
      where.push("(tenCaLamViec LIKE ? OR moTa LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (String(status).toUpperCase() !== "ALL") {
      where.push("trangThai = ?");
      params.push(Number(status));
    }

    const sql =
      `SELECT maCaLamViec, tenCaLamViec, gioVao, gioRa, trangThai, moTa
         FROM calamviec
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY gioVao ASC
        LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(sql, [...params, Number(limit), Number(offset)]);
    return rows;
  },

  async count({ q = "", status = "ALL" }) {
    const where = [];
    const params = [];
    if (q) {
      where.push("(tenCaLamViec LIKE ? OR moTa LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (String(status).toUpperCase() !== "ALL") {
      where.push("trangThai = ?");
      params.push(Number(status));
    }
    const [rows] = await pool.query(
      `SELECT COUNT(*) n FROM calamviec ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
      params
    );
    return Number(rows[0]?.n || 0);
  },

  async get(ma) {
    const [rows] = await pool.query(
      `SELECT maCaLamViec, tenCaLamViec, gioVao, gioRa, trangThai, moTa
         FROM calamviec WHERE maCaLamViec=? LIMIT 1`,
      [ma]
    );
    return rows[0] || null;
  },

  async create({ tenCaLamViec, gioVao, gioRa, trangThai = 1, moTa = null }) {
    await pool.query(
      `INSERT INTO calamviec (tenCaLamViec, gioVao, gioRa, trangThai, moTa)
       VALUES (?, ?, ?, ?, ?)`,
      [tenCaLamViec, gioVao, gioRa, Number(trangThai), moTa]
    );
    // lấy mã vừa sinh theo khóa tự nhiên
    const [rows] = await pool.query(
      `SELECT maCaLamViec FROM calamviec
        WHERE tenCaLamViec=? AND gioVao=? AND gioRa=?
        ORDER BY maCaLamViec DESC LIMIT 1`,
      [tenCaLamViec, gioVao, gioRa]
    );
    return rows[0]?.maCaLamViec || null;
  },

  async update(ma, { tenCaLamViec, gioVao, gioRa, trangThai, moTa }) {
    const fields = [], params = [];
    if (tenCaLamViec !== undefined) { fields.push("tenCaLamViec=?"); params.push(tenCaLamViec); }
    if (gioVao       !== undefined) { fields.push("gioVao=?");       params.push(gioVao); }
    if (gioRa        !== undefined) { fields.push("gioRa=?");        params.push(gioRa); }
    if (trangThai    !== undefined) { fields.push("trangThai=?");    params.push(Number(trangThai)); }
    if (moTa         !== undefined) { fields.push("moTa=?");         params.push(moTa); }
    if (!fields.length) return 0;

    params.push(ma);
    const [rs] = await pool.query(
      `UPDATE calamviec SET ${fields.join(", ")} WHERE maCaLamViec=?`,
      params
    );
    return rs.affectedRows || 0;
  },

  async isReferenced(ma) {
    const [rows] = await pool.query(
      `SELECT 1 FROM lichlamviec WHERE maCaLamViec=? LIMIT 1`, [ma]
    );
    return !!rows.length;
  },

  async remove(ma) {
    const [rs] = await pool.query(`DELETE FROM calamviec WHERE maCaLamViec=?`, [ma]);
    return rs.affectedRows || 0;
  }
};
