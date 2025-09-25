import { UsersModel } from "./users.model.js";
import { AppError } from "../../core/http/error.js";
import { pool } from "../../config/db.js";
import { DoctorModel } from "../doctor/doctor.model.js";

export const UsersService = {
  findByUsername: (u) => UsersModel.findByUsername(u),
  findById: (id) => UsersModel.findById(id),

  async ensureUsernameFree(tenDangNhap) {
    const existed = await UsersModel.findByUsername(tenDangNhap);
    if (existed) throw new AppError(409, "Tên đăng nhập đã tồn tại");
  },

  create: (data) => UsersModel.create(data),

  // Tạo user vaiTro=2 + hồ sơ BacSi (1–1) trong 1 transaction
  async createDoctorWithProfile({
    tenDangNhap, matKhauHash, hoTen, soDienThoai = null, email = null,
    idChuyenKhoa,  // required by schema
    // optional profile fields of BacSi:
    bangCap = null, chungChi = null, kinhNghiem = 0,
    chuyenMonChinh = null, chuyenMonPhu = null,
    soLuongBenhNhanToiDa = 20, thoiGianKhamBinhQuan = 15,
    ngayBatDauCongTac = null, phiKham = 0, ghiChu = null
  }) {
    if (!idChuyenKhoa) throw new AppError(400, "Thiếu idChuyenKhoa");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Tạo Users (vaiTro=2)
      const [rsUser] = await conn.query(
        `INSERT INTO Users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai)
         VALUES (?, ?, ?, ?, ?, 2, 1)`,
        [tenDangNhap, matKhauHash, hoTen, soDienThoai, email]
      );
      const idUser = rsUser.insertId;

      // 2) Tạo BacSi (KHÔNG đưa hoTen/soDienThoai/email vì bảng không có các cột đó)
      await DoctorModel.create(
        {
          idUser, tenBacSi: hoTen, idChuyenKhoa, bangCap, chungChi, kinhNghiem,
          chuyenMonChinh, chuyenMonPhu,
          soLuongBenhNhanToiDa, thoiGianKhamBinhQuan,
          ngayBatDauCongTac, phiKham, ghiChu
        },
        conn
      );

      await conn.commit();
      return idUser;
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  }
};
