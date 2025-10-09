// src/modules/users/users.model.js
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
  }
};
