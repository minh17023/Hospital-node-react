import { UsersService } from "../../users/users.service.js";
import { hash, compare } from "../../../core/utils/passwords.js";   
import { AppError } from "../../../core/http/error.js";
import { signAccessToken, signRefreshToken } from "../../../core/utils/jwt.js"; 
import { pool } from "../../../config/db.js";                   

const SALT = 10;

/* ========== ADMIN: tạo user cho bác sĩ đã có sẵn (giữ nguyên) ========== */
export const AdminDoctorUserController = {
  async registerDoctorUser(req, res, next) {
    try {
      const { tenDangNhap, matKhau, email = null, maBacSi } = req.body || {};
      if (!tenDangNhap || !matKhau || !maBacSi) {
        throw new AppError(422, "Thiếu tenDangNhap/matKhau/maBacSi");
      }

      await UsersService.ensureUsernameFree(tenDangNhap);
      await UsersService.ensureEmailFree(email);

      const matKhauHash = await hash(matKhau, SALT);
      const created = await UsersService.createUserForExistingDoctor({
        tenDangNhap,
        matKhauHash,
        email,
        maBacSi,
      });

      res.status(201).json({
        user: {
          maUser: created.maUser,
          tenDangNhap: created.tenDangNhap,
          email: created.email,
          vaiTro: created.vaiTro ?? 2,
          maBacSi,
        },
      });
    } catch (e) { next(e); }
  },
};

/* ========== DOCTOR: đăng nhập (đã fix) ========== */
export const DoctorAuthController = {
  async login(req, res, next) {
    try {
      const { tenDangNhap, matKhau } = req.body || {};
      if (!tenDangNhap || !matKhau) throw new AppError(400, "Thiếu username/password");

      // 1) Tìm user
      const user = await UsersService.findByUsername(tenDangNhap);
      if (!user) throw new AppError(401, "Sai thông tin đăng nhập");

      // 2) Ràng buộc vai trò & trạng thái
      if (Number(user.vaiTro) !== 2) throw new AppError(401, "Không có quyền DOCTOR");
      if (Number(user.trangThai) !== 1) throw new AppError(401, "Tài khoản đã bị khóa");

      // 3) So khớp mật khẩu
      const ok = await compare(matKhau, user.matKhauHash);
      if (!ok) throw new AppError(401, "Sai thông tin đăng nhập");

      // 4) Lấy họ tên từ bảng nhanvien nếu user đã link maBacSi
      let hoTen = null;
      if (user.maBacSi) {
        const [rows] = await pool.query(
          `SELECT nv.hoTen
             FROM bacsi b
             JOIN nhanvien nv ON nv.maNhanVien = b.maNhanVien
            WHERE b.maBacSi=? LIMIT 1`,
          [user.maBacSi]
        );
        hoTen = rows[0]?.hoTen ?? null;
      }

      // 5) JWT
      const accessToken  = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      // 6) Response
      res.json({
        accessToken,
        refreshToken,
        user: {
          maUser:  user.maUser,
          hoTen,
          vaiTro:  user.vaiTro,
          maBacSi: user.maBacSi ?? null,
        },
      });
    } catch (e) { next(e); }
  }
};
