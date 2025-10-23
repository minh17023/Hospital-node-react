import { pool } from "../../config/db.js";

export const UsersModel = {
  async findByUsername(tenDangNhap) {
    const [rows] = await pool.query(
      `SELECT 
         maUser,
         tenDangNhap,
         matKhauHash,
         hoTen,
         soDienThoai,
         email,
         vaiTro,
         trangThai,
         maBacSi,
         ngayTao
       FROM users
      WHERE tenDangNhap=? LIMIT 1`,
      [tenDangNhap] 
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT maUser FROM users WHERE email=? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findByMa(maUser) {
    const [rows] = await pool.query(
      `SELECT 
         maUser,
         tenDangNhap,
         matKhauHash,
         hoTen,
         soDienThoai,
         email,
         vaiTro,
         trangThai,
         maBacSi,
         ngayTao
       FROM users
      WHERE maUser=? LIMIT 1`,
      [maUser]
    );
    return rows[0] || null;
  },

  async findByMaBacSi(maBacSi) {
    const [rows] = await pool.query(
      `SELECT maUser FROM users WHERE maBacSi=? LIMIT 1`,
      [maBacSi]
    );
    return rows[0] || null;
  },

  // tạo user (không link bác sĩ)
  async create({ tenDangNhap, matKhauHash, email = null, vaiTro = 2, hoTen = null, soDienThoai = null }) {
    await pool.query(
      `INSERT INTO users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai, ngayTao)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro]
    );
    return await this.findByUsername(tenDangNhap);
  },

  // tạo user & gán mã bác sĩ — dùng ngoài transaction
  async createDoctorUser({ tenDangNhap, matKhauHash, email = null, maBacSi, hoTen = null, soDienThoai = null }) {
    await pool.query(
      `INSERT INTO users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai, maBacSi, ngayTao)
       VALUES (?, ?, ?, ?, ?, 2, 1, ?, NOW())`,
      [tenDangNhap, matKhauHash, hoTen, soDienThoai, email, maBacSi]
    );
    return await this.findByUsername(tenDangNhap);
  },

  // tạo trong transaction (nếu muốn reuse)
  async createWithConn({ tenDangNhap, matKhauHash, email = null, vaiTro = 2, hoTen = null, soDienThoai = null }, conn) {
    await conn.query(
      `INSERT INTO users (tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro, trangThai, ngayTao)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [tenDangNhap, matKhauHash, hoTen, soDienThoai, email, vaiTro]
    );
    const [rows] = await conn.query(
      `SELECT 
         maUser,
         tenDangNhap,
         matKhauHash,
         hoTen,
         soDienThoai,
         email,
         vaiTro,
         trangThai,
         maBacSi,
         ngayTao
       FROM users
      WHERE tenDangNhap=? LIMIT 1`,
      [tenDangNhap]
    );
    return rows[0] || null;
  },

  // danh sách + lọc + phân trang
  async list({ q, vaiTro, trangThai, limit = 50, offset = 0 }) {
    const conds = [];
    const vals = [];

    if (q) {
      conds.push(`(tenDangNhap LIKE CONCAT('%', ?, '%')
                OR email LIKE CONCAT('%', ?, '%')
                OR hoTen LIKE CONCAT('%', ?, '%')
                OR soDienThoai LIKE CONCAT('%', ?, '%'))`);
      vals.push(q, q, q, q);
    }
    if (vaiTro !== undefined && vaiTro !== null && String(vaiTro) !== "") {
      conds.push(`vaiTro = ?`);
      vals.push(Number(vaiTro));
    }
    if (trangThai !== undefined && trangThai !== null && String(trangThai) !== "") {
      conds.push(`trangThai = ?`);
      vals.push(Number(trangThai));
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const [cntRows] = await pool.query(
      `SELECT COUNT(*) AS n FROM users ${where}`,
      vals
    );
    const total = Number(cntRows[0]?.n || 0);

    const [rows] = await pool.query(
      `SELECT
        maUser,
        tenDangNhap,
        hoTen,
        soDienThoai,
        email,
        vaiTro,
        trangThai,
        maBacSi,
        ngayTao
       FROM users
       ${where}
       ORDER BY ngayTao DESC, maUser DESC
       LIMIT ? OFFSET ?`,
      [...vals, Number(limit), Number(offset)]
    );

    return { items: rows, total };
  },

  // cập nhật động
  async update(maUser, patch = {}) {
    const map = { // key input → cột DB
      email: "email",
      role: "vaiTro",
      trangthai: "trangThai",
      mabacsi: "maBacSi",
      passwordhash: "matKhauHash",
      hoten: "hoTen",
      sodienthoai: "soDienThoai",
    };

    const fields = [];
    const vals = [];
    for (const k in map) {
      if (patch[k] !== undefined) {
        fields.push(`${map[k]}=?`);
        vals.push(patch[k]);
      }
    }
    if (!fields.length) return { affected: 0 };

    vals.push(maUser);
    const [rs] = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE maUser=?`,
      vals
    );
    return { affected: rs.affectedRows };
  },

  // xóa
  async remove(maUser) {
    const [rs] = await pool.query(`DELETE FROM users WHERE maUser=?`, [maUser]);
    return { affected: rs.affectedRows };
  },
};
