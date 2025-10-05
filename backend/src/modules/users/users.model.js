import { pool } from "../../config/db.js";

export const UsersModel = {
  async findByUsername(tenDangNhap) {
    const [rows] = await pool.query(
      `SELECT maUser, tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai, ngayTao
         FROM Users WHERE tenDangNhap = ? LIMIT 1`,
      [tenDangNhap]
    );
    return rows[0] || null;
  },

  async findByMa(maUser) {
    const [rows] = await pool.query(
      `SELECT maUser, tenDangNhap, hoTen, soDienThoai, email, vaiTro, trangThai, ngayTao
         FROM Users WHERE maUser = ? LIMIT 1`,
      [maUser]
    );
    return rows[0] || null;
  },

  // tạo ngoài transaction
  async create({ tenDangNhap, matKhauHash, hoTen, soDienThoai=null, email=null, vaiTro=2 }) {
    await pool.query(
      `INSERT INTO Users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro]
    );
    // Lấy lại user để có maUser (do trigger sinh mã)
    return await this.findByUsername(tenDangNhap);
  },

  // tạo trong transaction (dùng bởi service)
  async createWithConn({ tenDangNhap, matKhauHash, hoTen, soDienThoai=null, email=null, vaiTro=2 }, conn) {
    await conn.query(
      `INSERT INTO Users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro]
    );
    const [rows] = await conn.query(
      `SELECT maUser, tenDangNhap, hoTen, soDienThoai, email, vaiTro, trangThai, ngayTao
         FROM Users WHERE tenDangNhap=? LIMIT 1`,
      [tenDangNhap]
    );
    return rows[0] || null;
  }
};
