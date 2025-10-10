import { pool } from "../../config/db.js";

export const UsersModel = {
  async findByUsername(tenDangNhap) {
    const [rows] = await pool.query(
      `SELECT 
         mauser       AS maUser,
         username     AS tenDangNhap,
         passwordhash AS matKhauHash,
         email,
         role         AS vaiTro,
         trangthai    AS trangThai,
         mabacsi      AS maBacSi,
         createdat    AS ngayTao
       FROM users
      WHERE username=? LIMIT 1`,
      [tenDangNhap] 
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT mauser AS maUser FROM users WHERE email=? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findByMa(maUser) {
    const [rows] = await pool.query(
      `SELECT 
         mauser       AS maUser,
         username     AS tenDangNhap,
         passwordhash AS matKhauHash,
         email,
         role         AS vaiTro,
         trangthai    AS trangThai,
         mabacsi      AS maBacSi,
         createdat    AS ngayTao
       FROM users
      WHERE mauser=? LIMIT 1`,
      [maUser]
    );
    return rows[0] || null;
  },

  async findByMaBacSi(maBacSi) {
    const [rows] = await pool.query(
      `SELECT mauser AS maUser FROM users WHERE mabacsi=? LIMIT 1`,
      [maBacSi]
    );
    return rows[0] || null;
  },

  // tạo user (không link bác sĩ)
  async create({ tenDangNhap, matKhauHash, email = null, vaiTro = 2 }) {
    await pool.query(
      `INSERT INTO users (username, passwordhash, email, role, trangthai)
       VALUES (?, ?, ?, ?, 1)`,
      [tenDangNhap, matKhauHash, email, vaiTro]
    );
    return await this.findByUsername(tenDangNhap);
  },

  // tạo user & gán mã bác sĩ — dùng ngoài transaction
  async createDoctorUser({ tenDangNhap, matKhauHash, email = null, maBacSi }) {
    await pool.query(
      `INSERT INTO users (username, passwordhash, email, role, trangthai, mabacsi, createdat)
       VALUES (?, ?, ?, 2, 1, ?, NOW())`,
      [tenDangNhap, matKhauHash, email, maBacSi]
    );
    return await this.findByUsername(tenDangNhap);
  },

  // tạo trong transaction (nếu muốn reuse)
  async createWithConn({ tenDangNhap, matKhauHash, email = null, vaiTro = 2 }, conn) {
    await conn.query(
      `INSERT INTO users (username, passwordhash, email, role, trangthai)
       VALUES (?, ?, ?, ?, 1)`,
      [tenDangNhap, matKhauHash, email, vaiTro]
    );
    const [rows] = await conn.query(
      `SELECT 
         mauser    AS maUser,
         username  AS tenDangNhap,
         passwordhash AS matKhauHash,
         email,
         role      AS vaiTro,
         trangthai AS trangThai,
         mabacsi   AS maBacSi,
         createdat AS ngayTao
       FROM users
      WHERE username=? LIMIT 1`,
      [tenDangNhap]
    );
    return rows[0] || null;
  },

  // danh sách + lọc + phân trang
  async list({ q, vaiTro, trangThai, limit = 50, offset = 0 }) {
    const conds = [];
    const vals = [];

    if (q) {
      conds.push(`(username LIKE CONCAT('%', ?, '%') OR email LIKE CONCAT('%', ?, '%'))`);
      vals.push(q, q);
    }
    if (vaiTro !== undefined && vaiTro !== null && String(vaiTro) !== "") {
      conds.push(`role = ?`);
      vals.push(Number(vaiTro));
    }
    if (trangThai !== undefined && trangThai !== null && String(trangThai) !== "") {
      conds.push(`trangthai = ?`);
      vals.push(Number(trangThai));
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const [cntRows] = await pool.query(
      `SELECT COUNT(*) AS n FROM users ${where}`,
      vals
    );
    const total = Number(cntRows[0]?.n || 0);

    const [rows] = await pool.query(
      `SELECT
        mauser       AS maUser,
        username     AS tenDangNhap,
        email,
        role         AS vaiTro,
        trangthai    AS trangThai,
        mabacsi      AS maBacSi,
        createdat    AS ngayTao
       FROM users
       ${where}
       ORDER BY createdat DESC, mauser DESC
       LIMIT ? OFFSET ?`,
      [...vals, Number(limit), Number(offset)]
    );

    return { items: rows, total };
  },

  // cập nhật động
  async update(maUser, patch = {}) {
    const allow = ["email", "role", "trangthai", "mabacsi", "passwordhash"];
    const fields = [];
    const vals = [];
    for (const k of allow) {
      if (patch[k] !== undefined) {
        fields.push(`${k}=?`);
        vals.push(patch[k]);
      }
    }
    if (!fields.length) return { affected: 0 };
    vals.push(maUser);
    const [rs] = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE mauser=?`,
      vals
    );
    return { affected: rs.affectedRows };
  },

  // xóa
  async remove(maUser) {
    const [rs] = await pool.query(`DELETE FROM users WHERE mauser=?`, [maUser]);
    return { affected: rs.affectedRows };
  },
};
