import { pool } from "../../config/db.js";

export const BacSiModel = {
  // only fields that exist in table BacSi
  async create(
    {
      idUser,
      idChuyenKhoa,
      bangCap = null,
      chungChi = null,
      kinhNghiem = 0,
      chuyenMonChinh = null,
      chuyenMonPhu = null,
      soLuongBenhNhanToiDa = 20,
      thoiGianKhamBinhQuan = 15,
      ngayBatDauCongTac = null,
      phiKham = 0,
      ghiChu = null
    },
    conn = pool
  ) {
    const [rs] = await conn.query(
      `INSERT INTO BacSi
       (idUser, idChuyenKhoa, bangCap, chungChi, kinhNghiem, chuyenMonChinh, chuyenMonPhu,
        soLuongBenhNhanToiDa, thoiGianKhamBinhQuan, ngayBatDauCongTac, phiKham, ghiChu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUser, idChuyenKhoa, bangCap, chungChi, kinhNghiem, chuyenMonChinh, chuyenMonPhu,
        soLuongBenhNhanToiDa, thoiGianKhamBinhQuan, ngayBatDauCongTac, phiKham, ghiChu
      ]
    );
    return rs.insertId; // idBacSi
  }
};
