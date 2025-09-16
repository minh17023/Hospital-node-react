import { UsersService } from "../../users/users.service.js";
import { compare } from "../../../core/utils/passwords.js";
import { signAccessToken, signRefreshToken } from "../../../core/utils/jwt.js";
import { AppError } from "../../../core/http/error.js";

export const AdminAuthController = {
  async login(req, res, next) {
    try {
      const { tenDangNhap, matKhau } = req.body || {};
      if (!tenDangNhap || !matKhau) throw new AppError(400, "Thiếu username/password");
      const user = await UsersService.findByUsername(tenDangNhap);
      if (!user || user.vaiTro !== 1 || user.trangThai !== 1) throw new AppError(401, "Không có quyền ADMIN hoặc tài khoản bị khóa");
      const ok = await compare(matKhau, user.matKhauHash);
      if (!ok) throw new AppError(401, "Sai thông tin đăng nhập");
      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);
      res.json({ accessToken, refreshToken, user: { idUser: user.idUser, tenDangNhap: user.tenDangNhap, hoTen: user.hoTen, vaiTro: user.vaiTro } });
    } catch (e) { next(e); }
  }
};
