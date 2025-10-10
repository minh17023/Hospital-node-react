import { UsersService } from "./users.service.js";
import { AppError } from "../../core/http/error.js";
import { hash } from "../../core/utils/passwords.js";

const SALT = 10;

export const UsersController = {
  /* GET /users?q=&vaiTro=&trangThai=&limit=&offset= */
  async list(req, res, next) {
    try {
      const rs = await UsersService.list({
        q: req.query.q,
        vaiTro: req.query.vaiTro ?? req.query.role,
        trangThai: req.query.trangThai ?? req.query.status,
        limit: req.query.limit ?? 50,
        offset: req.query.offset ?? 0,
      });
      res.json(rs); // { items, total }
    } catch (e) { next(e); }
  },

  /* GET /users/:maUser */
  async getOne(req, res, next) {
    try {
      const u = await UsersService.findById(req.params.maUser);
      if (!u) throw new AppError(404, "Không tìm thấy user");
      // Ẩn hash khi trả về
      delete u.matKhauHash;
      res.json({ user: u });
    } catch (e) { next(e); }
  },

  /* PUT /users/:maUser  (email, role, trangthai, mabacsi, password) */
  async update(req, res, next) {
    try {
      const maUser = req.params.maUser;
      const body = {};
      if (req.body.email !== undefined) body.email = req.body.email || null;
      if (req.body.vaiTro !== undefined || req.body.role !== undefined)
        body.role = Number(req.body.vaiTro ?? req.body.role);
      if (req.body.trangThai !== undefined || req.body.status !== undefined)
        body.trangthai = Number(req.body.trangThai ?? req.body.status);
      if (req.body.maBacSi !== undefined) body.mabacsi = req.body.maBacSi || null;

      // đổi mật khẩu (nếu có)
      if (req.body.matKhau !== undefined && String(req.body.matKhau).trim() !== "") {
        body.passwordhash = await hash(String(req.body.matKhau), SALT);
      }

      const rs = await UsersService.update(maUser, body);
      res.json(rs); // { affected }
    } catch (e) { next(e); }
  },

  /* DELETE /users/:maUser */
  async remove(req, res, next) {
    try {
      const rs = await UsersService.remove(req.params.maUser);
      res.json(rs); // { affected }
    } catch (e) { next(e); }
  },
};
