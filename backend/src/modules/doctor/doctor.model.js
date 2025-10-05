import { pool } from "../../config/db.js";

const T = "BacSi";

export const DoctorModel = {
  async create(
    {
      maUser,
      tenBacSi,
      maChuyenKhoa,
      bangCap = null,
      chungChi = null,
      kinhNghiem = 0,
      chuyenMonChinh = null,
      chuyenMonPhu = null,
      soLuongBenhNhanToiDa = 20,
      thoiGianKhamBinhQuan = 15,
      ngayBatDauCongTac = null,
      phiKham = 0,
      ghiChu = null,
      trangThai = 1,
    },
    conn = pool
  ) {
    if (!maUser || !maChuyenKhoa) {
      throw Object.assign(new Error("Missing maUser/maChuyenKhoa"), { code: "VALIDATION" });
    }

    // Trigger trong DB sẽ sinh maBacSi
    await conn.query(
      `INSERT INTO ${T}
        (maUser, tenBacSi, maChuyenKhoa, bangCap, chungChi, kinhNghiem,
         chuyenMonChinh, chuyenMonPhu, soLuongBenhNhanToiDa,
         thoiGianKhamBinhQuan, ngayBatDauCongTac, phiKham,
         ghiChu, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        maUser, tenBacSi, maChuyenKhoa,
        bangCap, chungChi, kinhNghiem,
        chuyenMonChinh, chuyenMonPhu, soLuongBenhNhanToiDa,
        thoiGianKhamBinhQuan, ngayBatDauCongTac, phiKham,
        ghiChu, trangThai,
      ]
    );

    // Lấy lại bản ghi vừa tạo theo (maUser, maChuyenKhoa, tenBacSi)
    const [rows] = await conn.query(
      `SELECT b.*, ck.tenChuyenKhoa
         FROM ${T} b
         LEFT JOIN ChuyenKhoa ck ON ck.maChuyenKhoa = b.maChuyenKhoa
        WHERE b.maUser=? AND b.maChuyenKhoa=? AND b.tenBacSi=?
        ORDER BY b.maBacSi DESC
        LIMIT 1`,
      [maUser, maChuyenKhoa, tenBacSi]
    );
    return rows[0] || null;
  },

  async findByMa(maBacSi) {
    const [rows] = await pool.query(
      `SELECT b.*, ck.tenChuyenKhoa
         FROM ${T} b
         LEFT JOIN ChuyenKhoa ck ON ck.maChuyenKhoa = b.maChuyenKhoa
        WHERE b.maBacSi = ? LIMIT 1`,
      [maBacSi]
    );
    return rows[0] || null;
  },

  async findByUser(maUser) {
    const [rows] = await pool.query(
      `SELECT * FROM ${T} WHERE maUser = ? LIMIT 1`,
      [maUser]
    );
    return rows[0] || null;
  },

  async list({ maChuyenKhoa = null, q = "", trangThai = null, feeMin = null, feeMax = null, limit = 50, offset = 0 }) {
    const conds = [];
    const vals = [];

    if (maChuyenKhoa) { conds.push("b.maChuyenKhoa = ?"); vals.push(String(maChuyenKhoa)); }
    if (trangThai !== null && trangThai !== undefined) { conds.push("b.trangThai = ?"); vals.push(Number(trangThai)); }
    if (q) {
      conds.push("(b.tenBacSi LIKE ? OR b.chuyenMonChinh LIKE ? OR b.chuyenMonPhu LIKE ? OR ck.tenChuyenKhoa LIKE ?)");
      vals.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (feeMin != null) { conds.push("b.phiKham >= ?"); vals.push(Number(feeMin)); }
    if (feeMax != null) { conds.push("b.phiKham <= ?"); vals.push(Number(feeMax)); }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT b.*, ck.tenChuyenKhoa
         FROM ${T} b
         LEFT JOIN ChuyenKhoa ck ON ck.maChuyenKhoa = b.maChuyenKhoa
        ${where}
        ORDER BY b.maBacSi DESC
        LIMIT ? OFFSET ?`,
      [...vals, Number(limit), Number(offset)]
    );
    return rows;
  },

  async listBySpecialty(maChuyenKhoa, { trangThai = null, limit = 50, offset = 0 } = {}) {
    const conds = ["b.maChuyenKhoa = ?"];
    const vals = [String(maChuyenKhoa)];
    if (trangThai !== null && trangThai !== undefined) { conds.push("b.trangThai = ?"); vals.push(Number(trangThai)); }
    const where = `WHERE ${conds.join(" AND ")}`;
    const [rows] = await pool.query(
      `SELECT b.*, ck.tenChuyenKhoa
         FROM BacSi b
         LEFT JOIN ChuyenKhoa ck ON ck.maChuyenKhoa = b.maChuyenKhoa
        ${where}
        ORDER BY b.maBacSi DESC
        LIMIT ? OFFSET ?`,
      [...vals, Number(limit), Number(offset)]
    );
    return rows;
  },

  async update(maBacSi, patch) {
    const allow = [
      "maChuyenKhoa", "tenBacSi",
      "bangCap", "chungChi", "kinhNghiem",
      "chuyenMonChinh", "chuyenMonPhu", "soLuongBenhNhanToiDa",
      "thoiGianKhamBinhQuan", "ngayBatDauCongTac", "phiKham",
      "ghiChu", "trangThai",
    ];
    const fields = [], values = [];
    for (const k of allow) if (patch[k] !== undefined) { fields.push(`${k}=?`); values.push(patch[k]); }
    if (!fields.length) return 0;
    values.push(maBacSi);
    const [rs] = await pool.query(`UPDATE ${T} SET ${fields.join(", ")} WHERE maBacSi = ?`, values);
    return rs.affectedRows || 0;
  },

  async remove(maBacSi) {
    const [rs] = await pool.query(`DELETE FROM ${T} WHERE maBacSi = ?`, [maBacSi]);
    return rs.affectedRows || 0;
  },
};
