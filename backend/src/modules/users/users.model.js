import { pool } from "../../config/db.js";

export const UsersModel = {
  async findByUsername(tenDangNhap) {
    const [rows] = await pool.query(
      `SELECT idUser, tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai, ngayTao
         FROM Users WHERE tenDangNhap = ? LIMIT 1`,
      [tenDangNhap]
    );
    return rows[0] || null;
  },

  async findById(idUser) {
    const [rows] = await pool.query(
      `SELECT idUser, tenDangNhap, hoTen, soDienThoai, email, vaiTro, trangThai, ngayTao
         FROM Users WHERE idUser = ? LIMIT 1`,
      [idUser]
    );
    return rows[0] || null;
  },

  // tạo ngoài transaction
  async create({ tenDangNhap, matKhauHash, hoTen, soDienThoai=null, email=null, vaiTro=2 }) {
    const [rs] = await pool.query(
      `INSERT INTO Users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro]
    );
    return rs.insertId;
  },

  // tạo trong transaction (dùng bởi service)
  async createWithConn({ tenDangNhap, matKhauHash, hoTen, soDienThoai=null, email=null, vaiTro=2 }, conn) {
    const [rs] = await conn.query(
      `INSERT INTO Users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro]
    );
    return rs.insertId;
  }
};
