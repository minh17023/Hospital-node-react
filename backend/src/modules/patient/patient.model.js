import { pool } from "../../config/db.js";

export const PatientModel = {
  async findByCCCD(soCCCD) {
    const [rows] = await pool.query(
      "SELECT * FROM benhnhan WHERE soCCCD=? LIMIT 1",
      [soCCCD]
    );
    return rows[0] || null;
  },

  async findByMa(maBenhNhan) {
    const [rows] = await pool.query(
      "SELECT * FROM benhnhan WHERE maBenhNhan=? LIMIT 1",
      [maBenhNhan]
    );
    return rows[0] || null;
  },

  async list({
    q = "",
    trangThai = null,
    from = null,
    to = null,
    limit = 50,
    offset = 0,
    orderBy = "maBenhNhan",
    order = "DESC",
  }) {
    const conds = [];
    const vals  = [];

    if (q) {
      conds.push("(hoTen LIKE ? OR soCCCD LIKE ? OR soDienThoai LIKE ? OR email LIKE ? OR soBHYT LIKE ? OR maBenhNhan LIKE ?)");
      const like = `%${q}%`;
      vals.push(like, like, like, like, like, like);
    }
    if (trangThai !== null && trangThai !== undefined) {
      conds.push("trangThai = ?");
      vals.push(Number(trangThai));
    }
    if (from) { conds.push("DATE(ngayTao) >= ?"); vals.push(from); }
    if (to)   { conds.push("DATE(ngayTao) <= ?"); vals.push(to); }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    // Đếm tổng
    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS n FROM benhnhan ${where}`,
      vals
    );
    const total = Number(cnt[0]?.n || 0);

    const safeOrderBy = ["maBenhNhan","ngayTao","hoTen"].includes(orderBy) ? orderBy : "maBenhNhan";
    const safeOrder   = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const [rows] = await pool.query(
      `SELECT maBenhNhan, hoTen, ngaySinh, gioiTinh, soCCCD, soBHYT, diaChi, soDienThoai, email,
              ngheNghiep, tinhTrangHonNhan, nguoiLienHe, sdtLienHe, ngayTao, trangThai
         FROM benhnhan
         ${where}
         ORDER BY ${safeOrderBy} ${safeOrder}
         LIMIT ? OFFSET ?`,
      [...vals, Number(limit), Number(offset)]
    );

    return { items: rows, total };
  },

  async create(data, conn = pool) {
    const {
      hoTen, ngaySinh, gioiTinh, soCCCD,
      soBHYT = null,
      diaChi = null, soDienThoai = null, email = null,
      ngheNghiep = null, tinhTrangHonNhan = null,
      nguoiLienHe = null, sdtLienHe = null,
      nguoiTao = "api", trangThai = 1
    } = data;

    // Trigger trong DB sẽ tự sinh maBenhNhan
    await conn.query(
      `INSERT INTO benhnhan
       (hoTen, ngaySinh, gioiTinh, soCCCD, soBHYT, diaChi, soDienThoai, email,
        ngheNghiep, tinhTrangHonNhan, nguoiLienHe, sdtLienHe, ngayTao, nguoiTao, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        hoTen, ngaySinh, gioiTinh, soCCCD, soBHYT, diaChi, soDienThoai, email,
        ngheNghiep, tinhTrangHonNhan, nguoiLienHe, sdtLienHe, nguoiTao, trangThai
      ]
    );

    return await this.findByCCCD(soCCCD);
  },

  async update(maBenhNhan, patch) {
    const allow = [
      "hoTen","ngaySinh","gioiTinh","soBHYT",
      "diaChi","soDienThoai","email",
      "ngheNghiep","tinhTrangHonNhan",
      "nguoiLienHe","sdtLienHe","trangThai"
    ];

    const fields = [], values = [];
    for (const k of allow) {
      if (patch[k] !== undefined) {
        fields.push(`${k}=?`);
        values.push(patch[k]);
      }
    }
    if (!fields.length) return 0;

    values.push(maBenhNhan);
    const [rs] = await pool.query(
      `UPDATE benhnhan SET ${fields.join(", ")} WHERE maBenhNhan=?`,
      values
    );
    return rs.affectedRows;
  },

  async remove(maBenhNhan) {
    const [rs] = await pool.query(
      "DELETE FROM benhnhan WHERE maBenhNhan=?",
      [maBenhNhan]
    );
    return rs;
  },

  async listBHYT(maBenhNhan) {
    const [rows] = await pool.query(
      "SELECT * FROM baohiemyte WHERE maBenhNhan=? ORDER BY maBHYT DESC",
      [maBenhNhan]
    );
    return rows;
  }
};
