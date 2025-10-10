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

  async createUserForExistingDoctor({ tenDangNhap, matKhauHash, email = null, maBacSi }) {
    if (!tenDangNhap || !matKhauHash || !maBacSi) {
      throw new AppError(422, "Thiếu tenDangNhap/matKhauHash/maBacSi");
    }
    const [bs] = await pool.query(`SELECT 1 FROM bacsi WHERE maBacSi=? LIMIT 1`, [maBacSi]);
    if (!bs.length) throw new AppError(404, "Không tìm thấy bác sĩ");

    const existsUser = await UsersModel.findByUsername(tenDangNhap);
    if (existsUser) throw new AppError(409, "Tên đăng nhập đã tồn tại");

    const existsEmail = await UsersModel.findByEmail(email);
    if (existsEmail) throw new AppError(409, "Email đã tồn tại");

    const linked = await UsersModel.findByMaBacSi(maBacSi);
    if (linked) throw new AppError(409, "Bác sĩ đã có tài khoản");

    const u = await UsersModel.createDoctorUser({ tenDangNhap, matKhauHash, email, maBacSi });
    return u;
  },

  /* ===== mới thêm cho GET/LIST/PUT/DELETE ===== */
  list: (query) => UsersModel.list(query),

  async update(maUser, body = {}) {
    // Nếu cập nhật liên kết bác sĩ: phải tồn tại và không bị trùng với user khác
    if (body.mabacsi !== undefined) {
      const newBS = body.mabacsi;
      if (newBS === null || newBS === "" || newBS === 0) {
        // cho phép gỡ link
      } else {
        const [bs] = await pool.query(`SELECT 1 FROM bacsi WHERE maBacSi=? LIMIT 1`, [newBS]);
        if (!bs.length) throw new AppError(404, "Không tìm thấy bác sĩ");

        const linked = await UsersModel.findByMaBacSi(newBS);
        if (linked && String(linked.maUser) !== String(maUser)) {
          throw new AppError(409, "Bác sĩ này đã được liên kết với tài khoản khác");
        }
      }
    }
    const rs = await UsersModel.update(maUser, body);
    if (!rs.affected) throw new AppError(400, "Không có thay đổi");
    return rs;
  },

  async remove(maUser) {
    const cur = await UsersModel.findByMa(maUser);
    if (!cur) throw new AppError(404, "Không tìm thấy user");
    const rs = await UsersModel.remove(maUser);
    return rs;
  },
};
