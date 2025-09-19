import { pool } from "../../config/db.js";

const T = "BacSi";

export const DoctorModel = {
  // GIỮ NGUYÊN: tạo bác sĩ (đã có sẵn ở auth flow)
  async create(
    {
      idUser, idChuyenKhoa,
      bangCap = null, chungChi = null, kinhNghiem = 0,
      chuyenMonChinh = null, chuyenMonPhu = null,
      soLuongBenhNhanToiDa = 20, thoiGianKhamBinhQuan = 15,
      ngayBatDauCongTac = null, phiKham = 0, ghiChu = null,
      trangThai = 1,
    },
    conn = pool
  ) {
    if (!idUser || !idChuyenKhoa) {
      throw Object.assign(new Error("Missing idUser/idChuyenKhoa"), { code: "VALIDATION" });
    }
    const [rs] = await conn.query(
      `INSERT INTO ${T}
         (idUser, idChuyenKhoa, bangCap, chungChi, kinhNghiem,
          chuyenMonChinh, chuyenMonPhu, soLuongBenhNhanToiDa,
          thoiGianKhamBinhQuan, ngayBatDauCongTac, phiKham, ghiChu, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUser, idChuyenKhoa, bangCap, chungChi, kinhNghiem,
        chuyenMonChinh, chuyenMonPhu, soLuongBenhNhanToiDa,
        thoiGianKhamBinhQuan, ngayBatDauCongTac, phiKham, ghiChu, trangThai
      ]
    );
    return rs.insertId;
  },

  async findById(idBacSi) {
    const [rows] = await pool.query(
      `SELECT b.*, ck.tenChuyenKhoa, u.hoTen AS hoTen
       FROM ${T} b
       LEFT JOIN ChuyenKhoa ck ON ck.idChuyenKhoa = b.idChuyenKhoa
       LEFT JOIN Users       u ON u.idUser       = b.idUser
       WHERE b.idBacSi = ? LIMIT 1`,
      [Number(idBacSi)]
    );
    return rows[0] || null;
  },

  async findByUser(idUser) {
    const [rows] = await pool.query(
      `SELECT b.*, ck.tenChuyenKhoa, u.hoTen AS hoTen
       FROM ${T} b
       LEFT JOIN ChuyenKhoa ck ON ck.idChuyenKhoa = b.idChuyenKhoa
       LEFT JOIN Users       u ON u.idUser       = b.idUser
       WHERE b.idUser = ? LIMIT 1`,
      [Number(idUser)]
    );
    return rows[0] || null;
  },

  async list({
    idChuyenKhoa = null,
    q = "",
    trangThai = null,
    feeMin = null,
    feeMax = null,
    limit = 50,
    offset = 0,
  }) {
    const conds = [];
    const vals  = [];

    if (idChuyenKhoa) { conds.push("b.idChuyenKhoa = ?"); vals.push(Number(idChuyenKhoa)); }
    if (trangThai !== null && trangThai !== undefined && String(trangThai) !== "") {
      conds.push("b.trangThai = ?"); vals.push(Number(trangThai));
    }
    if (q) {
      conds.push("(u.hoTen LIKE ? OR b.chuyenMonChinh LIKE ? OR b.chuyenMonPhu LIKE ? OR ck.tenChuyenKhoa LIKE ?)");
      vals.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (feeMin != null) { conds.push("b.phiKham >= ?"); vals.push(Number(feeMin)); }
    if (feeMax != null) { conds.push("b.phiKham <= ?"); vals.push(Number(feeMax)); }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT b.*, ck.tenChuyenKhoa, u.hoTen AS hoTen
       FROM ${T} b
       LEFT JOIN ChuyenKhoa ck ON ck.idChuyenKhoa = b.idChuyenKhoa
       LEFT JOIN Users       u ON u.idUser       = b.idUser
       ${where}
       ORDER BY b.idBacSi DESC
       LIMIT ? OFFSET ?`,
      [...vals, Number(limit), Number(offset)]
    );
    return rows;
  },

  async listBySpecialty(idChuyenKhoa, { trangThai = null, limit = 50, offset = 0 } = {}) {
    const conds = ["b.idChuyenKhoa = ?"];
    const vals  = [Number(idChuyenKhoa)];
    if (trangThai !== null && trangThai !== undefined && String(trangThai) !== "") {
      conds.push("b.trangThai = ?"); vals.push(Number(trangThai));
    }
    const where = `WHERE ${conds.join(" AND ")}`;

    const [rows] = await pool.query(
      `SELECT b.*, ck.tenChuyenKhoa, u.hoTen AS hoTen
       FROM ${T} b
       LEFT JOIN ChuyenKhoa ck ON ck.idChuyenKhoa = b.idChuyenKhoa
       LEFT JOIN Users       u ON u.idUser       = b.idUser
       ${where}
       ORDER BY b.idBacSi DESC
       LIMIT ? OFFSET ?`,
      [...vals, Number(limit), Number(offset)]
    );
    return rows;
  },

  async update(idBacSi, patch) {
    const allow = [
      "idChuyenKhoa","bangCap","chungChi","kinhNghiem",
      "chuyenMonChinh","chuyenMonPhu","soLuongBenhNhanToiDa",
      "thoiGianKhamBinhQuan","ngayBatDauCongTac","phiKham",
      "ghiChu","trangThai",
    ];
    const fields = [];
    const values = [];
    for (const k of allow) {
      if (patch[k] !== undefined) { fields.push(`${k}=?`); values.push(patch[k]); }
    }
    if (!fields.length) return 0;
    values.push(Number(idBacSi));
    const [rs] = await pool.query(
      `UPDATE ${T} SET ${fields.join(", ")} WHERE idBacSi=?`,
      values
    );
    return rs.affectedRows || 0;
  },

  async remove(idBacSi) {
    const [rs] = await pool.query(`DELETE FROM ${T} WHERE idBacSi=?`, [Number(idBacSi)]);
    return rs.affectedRows || 0;
  },
};
