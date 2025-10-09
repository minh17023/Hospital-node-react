// src/modules/users/users.service.js
import { UsersModel } from "./users.model.js";
import { AppError } from "../../core/http/error.js";
import { pool } from "../../config/db.js";

export const UsersService = {
  findByUsername: (u) => UsersModel.findByUsername(u),
  findById: (ma) => UsersModel.findByMa(ma),

  async ensureUsernameFree(tenDangNhap) {
    const existed = await UsersModel.findByUsername(tenDangNhap);
    if (existed) throw new AppError(409, "Tên đăng nhập đã tồn tại");
  },

  async ensureEmailFree(email) {
    if (!email) return;
    const existed = await UsersModel.findByEmail(email);
    if (existed) throw new AppError(409, "Email đã tồn tại");
  },

  create: (data) => UsersModel.create(data),

  /**
   * Admin: tạo user DOCTOR cho BÁC SĨ đã có (chỉ gán mã, không tạo hồ sơ bacsi)
   */
  async createUserForExistingDoctor({ tenDangNhap, matKhauHash, email = null, maBacSi }) {
    if (!tenDangNhap || !matKhauHash || !maBacSi) {
      throw new AppError(422, "Thiếu tenDangNhap/matKhauHash/maBacSi");
    }

    // bác sĩ phải tồn tại
    const [bs] = await pool.query(`SELECT 1 FROM bacsi WHERE maBacSi=? LIMIT 1`, [maBacSi]);
    if (!bs.length) throw new AppError(404, "Không tìm thấy bác sĩ");

    // username/email/mabacsi không được trùng
    const existsUser = await UsersModel.findByUsername(tenDangNhap);
    if (existsUser) throw new AppError(409, "Tên đăng nhập đã tồn tại");

    const existsEmail = await UsersModel.findByEmail(email);
    if (existsEmail) throw new AppError(409, "Email đã tồn tại");

    const linked = await UsersModel.findByMaBacSi(maBacSi);
    if (linked) throw new AppError(409, "Bác sĩ đã có tài khoản");

    // tạo user & gán mã bác sĩ
    const u = await UsersModel.createDoctorUser({ tenDangNhap, matKhauHash, email, maBacSi });
    return u; // { maUser, tenDangNhap, ... }
  },
};
