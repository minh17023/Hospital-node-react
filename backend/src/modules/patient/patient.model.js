import { pool } from "../../config/db.js";

export const PatientModel = {
  async findByCCCD(soCCCD) {
    const [rows] = await pool.query(
      "SELECT * FROM BenhNhan WHERE soCCCD=? LIMIT 1",
      [soCCCD]
    );
    return rows[0] || null;
  },

  async findById(idBenhNhan) {
    const [rows] = await pool.query(
      "SELECT * FROM BenhNhan WHERE idBenhNhan=? LIMIT 1",
      [idBenhNhan]
    );
    return rows[0] || null;
  },

  async create(data, conn = pool) {
    const {
      hoTen, ngaySinh, gioiTinh, soCCCD,
      soBHYT = null,
      diaChi = null, soDienThoai = null, email = null,
      ngheNghiep = null, tinhTrangHonNhan = null,
      nguoiLienHe = null, sdtLienHe = null,
      nguoiTao = "api", trangThai = 1
    } = data;

    const [rs] = await conn.query(
      `INSERT INTO BenhNhan
       (hoTen, ngaySinh, gioiTinh, soCCCD, soBHYT, diaChi, soDienThoai, email,
        ngheNghiep, tinhTrangHonNhan, nguoiLienHe, sdtLienHe, ngayTao, nguoiTao, trangThai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        hoTen, ngaySinh, gioiTinh, soCCCD, soBHYT, diaChi, soDienThoai, email,
        ngheNghiep, tinhTrangHonNhan, nguoiLienHe, sdtLienHe, nguoiTao, trangThai
      ]
    );
    return rs.insertId;
  },

  async update(idBenhNhan, patch) {
    const allow = [
      "hoTen","ngaySinh","gioiTinh","soBHYT",
      "diaChi","soDienThoai","email",
      "ngheNghiep","tinhTrangHonNhan",
      "nguoiLienHe","sdtLienHe","trangThai"
    ];

    const fields = [], values = [];
    for (const k of allow) {
      if (patch[k] !== undefined) {
        fields.push(`${k}=?`);
        values.push(patch[k]);
      }
    }
    if (!fields.length) return 0;

    values.push(idBenhNhan);
    const [rs] = await pool.query(
      `UPDATE BenhNhan SET ${fields.join(", ")} WHERE idBenhNhan=?`,
      values
    );
    return rs.affectedRows;
  },

  async remove(idBenhNhan) {
    const [rs] = await pool.query(
      "DELETE FROM BenhNhan WHERE idBenhNhan=?",
      [idBenhNhan]
    );
    return rs;
  },

  async listBHYT(idBenhNhan) {
    const [rows] = await pool.query(
      "SELECT * FROM BaoHiemYTe WHERE idBenhNhan=? ORDER BY idBHYT DESC",
      [idBenhNhan]
    );
    return rows;
  }
};
