import { UsersModel } from "./users.model.js";
import { AppError } from "../../core/http/error.js";
import { pool } from "../../config/db.js";
import { DoctorModel } from "../doctor/doctor.model.js";

export const UsersService = {
  findByUsername: (u) => UsersModel.findByUsername(u),
  // back-compat: hàm cũ findById -> chuyển sang tìm theo mã
  findById: (ma) => UsersModel.findByMa(ma),

  async ensureUsernameFree(tenDangNhap) {
    const existed = await UsersModel.findByUsername(tenDangNhap);
    if (existed) throw new AppError(409, "Tên đăng nhập đã tồn tại");
  },

  create: (data) => UsersModel.create(data),

  // Tạo user vaiTro=2 + hồ sơ BacSi (1–1) trong 1 transaction
  async createDoctorWithProfile({
    tenDangNhap, matKhauHash, hoTen, soDienThoai = null, email = null,
    maChuyenKhoa,  // ✔ dùng mã
    // optional profile fields of BacSi:
    bangCap = null, chungChi = null, kinhNghiem = 0,
    chuyenMonChinh = null, chuyenMonPhu = null,
    soLuongBenhNhanToiDa = 20, thoiGianKhamBinhQuan = 15,
    ngayBatDauCongTac = null, phiKham = 0, ghiChu = null
  }) {
    if (!maChuyenKhoa) throw new AppError(400, "Thiếu maChuyenKhoa");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Tạo Users (vaiTro=2)
      await conn.query(
        `INSERT INTO Users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai)
         VALUES (?, ?, ?, ?, ?, 2, 1)`,
        [tenDangNhap, matKhauHash, hoTen, soDienThoai, email]
      );
      // Lấy ra maUser vừa tạo
      const [urows] = await conn.query(
        `SELECT maUser, tenDangNhap, hoTen, vaiTro FROM Users WHERE tenDangNhap=? LIMIT 1`,
        [tenDangNhap]
      );
      const createdUser = urows[0];
      if (!createdUser?.maUser) throw new AppError(500, "Không lấy được maUser sau khi tạo");

      // 2) Tạo BacSi
      await DoctorModel.create(
        {
          maUser: createdUser.maUser,
          tenBacSi: hoTen,
          maChuyenKhoa,
          bangCap, chungChi, kinhNghiem,
          chuyenMonChinh, chuyenMonPhu,
          soLuongBenhNhanToiDa, thoiGianKhamBinhQuan,
          ngayBatDauCongTac, phiKham, ghiChu
        },
        conn
      );

      await conn.commit();
      return createdUser; // trả về object có maUser
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  }
};
