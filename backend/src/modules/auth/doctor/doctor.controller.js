import { UsersService } from "../../users/users.service.js";
import { hash, compare } from "../../../core/utils/passwords.js";
import { signAccessToken, signRefreshToken } from "../../../core/utils/jwt.js";
import { AppError } from "../../../core/http/error.js";

const SALT = 10;

export const DoctorAuthController = {
  // Đăng ký: tạo Users(vaiTro=2) + BacSi(maUser) theo service (transaction)
  async register(req, res, next) {
    try {
      const {
        tenDangNhap, matKhau, hoTen, soDienThoai=null, email=null,
        maChuyenKhoa, // ✔ dùng mã
        ...profile
      } = req.body || {};
      if (!tenDangNhap || !matKhau || !hoTen) throw new AppError(400, "Thiếu hoTen/tenDangNhap/matKhau");
      if (!maChuyenKhoa) throw new AppError(400, "Thiếu maChuyenKhoa");

      await UsersService.ensureUsernameFree(tenDangNhap);
      const matKhauHash = await hash(matKhau, SALT);

      const createdUser = await UsersService.createDoctorWithProfile({
        tenDangNhap, matKhauHash, hoTen, soDienThoai, email, maChuyenKhoa, ...profile
      });

      // Lấy lại user theo mã (nếu cần thêm field)
      const user = await UsersService.findById(createdUser.maUser);
      const doctor = await DoctorModel.findByUser(user.maUser);
      
      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          maUser: user.maUser,
          tenDangNhap: user.tenDangNhap,
          hoTen: user.hoTen,
          vaiTro: user.vaiTro
        }
      });
    } catch (e) { next(e); }
  },

  // Đăng nhập
  async login(req, res, next) {
    try {
      const { tenDangNhap, matKhau } = req.body || {};
      if (!tenDangNhap || !matKhau) throw new AppError(400, "Thiếu username/password");

      const user = await UsersService.findByUsername(tenDangNhap);
      if (!user || user.vaiTro !== 2 || user.trangThai !== 1)
        throw new AppError(401, "Không có quyền DOCTOR hoặc bị khóa");

      const ok = await compare(matKhau, user.matKhauHash);
      if (!ok) throw new AppError(401, "Sai thông tin đăng nhập");

      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      res.json({
        accessToken,
        refreshToken,
        user: {
          maUser: user.maUser,
          hoTen: user.hoTen,
          vaiTro: user.vaiTro
        }
      });
    } catch (e) { next(e); }
  }
};
