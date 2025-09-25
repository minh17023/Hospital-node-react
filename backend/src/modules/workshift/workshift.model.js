// src/modules/workshift/workshift.model.js
import { pool } from "../../config/db.js";

const T = "LichLamViec";

/* helper */
const q = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

/* ===== FE / Doctor-facing ===== */

/** Ngày có ca & còn chỗ trong tháng (tổng theo ngày) — alias giữ đúng tên cột DB */
export async function findWorkingDaysByDoctorMonth(idBacSi, firstDay, lastDay) {
  const sql = `
    SELECT
      llv.ngayLamViec,
      SUM(llv.soLuongBenhNhanToiDa) AS soLuongBenhNhanToiDa,
      SUM(llv.soLuongDaDangKy)      AS soLuongDaDangKy
    FROM ${T} llv
    WHERE llv.idBacSi = ?
      AND llv.trangThaiLamViec = 1
      AND llv.ngayLamViec BETWEEN ? AND ?
      AND llv.soLuongDaDangKy < llv.soLuongBenhNhanToiDa
    GROUP BY llv.ngayLamViec
    ORDER BY llv.ngayLamViec ASC
  `;
  return q(sql, [idBacSi, firstDay, lastDay]);
}

/** Các ca còn chỗ trong một ngày — field đúng tên cột DB */
export async function findShiftsByDoctorDate(idBacSi, ngayLamViec) {
  const sql = `
    SELECT
      llv.idLichLamViec,
      llv.idBacSi,
      llv.idPhongKham,
      pk.tenPhongKham,
      llv.idCaLamViec,
      clv.tenCaLamViec,
      clv.gioVao, clv.gioRa,
      llv.ngayLamViec,
      llv.soLuongBenhNhanToiDa,
      llv.soLuongDaDangKy,
      llv.trangThaiLamViec,
      llv.ngayTao,
      llv.nguoiTao
    FROM ${T} llv
    JOIN PhongKham pk  ON pk.idPhongKham  = llv.idPhongKham
    JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
    WHERE llv.idBacSi = ?
      AND llv.ngayLamViec = ?
      AND llv.trangThaiLamViec = 1
      AND llv.soLuongDaDangKy < llv.soLuongBenhNhanToiDa
    ORDER BY clv.gioVao ASC
  `;
  return q(sql, [idBacSi, ngayLamViec]);
}

/* ===== Admin/Doctor listing ===== */
export async function listWorkshifts({ idBacSi, idPhongKham, from, to, trangThaiLamViec }) {
  const conds = [];
  const vals = [];
  if (idBacSi)         { conds.push("llv.idBacSi = ?");          vals.push(Number(idBacSi)); }
  if (idPhongKham)     { conds.push("llv.idPhongKham = ?");      vals.push(Number(idPhongKham)); }
  if (from)            { conds.push("llv.ngayLamViec >= ?");     vals.push(from); }
  if (to)              { conds.push("llv.ngayLamViec <= ?");     vals.push(to); }
  if (trangThaiLamViec !== undefined && trangThaiLamViec !== null) {
    conds.push("llv.trangThaiLamViec = ?"); vals.push(Number(trangThaiLamViec));
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const sql = `
    SELECT
      llv.idLichLamViec,
      llv.idBacSi, bs.hoTen,
      llv.idPhongKham, pk.tenPhongKham,
      llv.idCaLamViec, clv.tenCaLamViec, clv.gioVao, clv.gioRa,
      llv.ngayLamViec,
      llv.soLuongBenhNhanToiDa,
      llv.soLuongDaDangKy,
      llv.trangThaiLamViec,
      llv.ngayTao,
      llv.nguoiTao
    FROM ${T} llv
    JOIN BacSi bs      ON bs.idBacSi      = llv.idBacSi
    JOIN PhongKham pk  ON pk.idPhongKham  = llv.idPhongKham
    JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
    ${where}
    ORDER BY llv.ngayLamViec DESC, clv.gioVao ASC
    LIMIT 500
  `;
  return q(sql, vals);
}

/** Tạo 1 LLV (giữ nguoiTao, để DB tự set ngayTao) */
export async function insertWorkshift({
  idBacSi, idPhongKham, idCaLamViec, ngayLamViec,
  soLuongBenhNhanToiDa = 20, trangThaiLamViec = 1,
  nguoiTao = null
}) {
  const sql = `
    INSERT INTO ${T}
      (idBacSi, idPhongKham, idCaLamViec, ngayLamViec,
       soLuongBenhNhanToiDa, soLuongDaDangKy, trangThaiLamViec,
       nguoiTao)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ON DUPLICATE KEY UPDATE
      idPhongKham = VALUES(idPhongKham),
      soLuongBenhNhanToiDa = VALUES(soLuongBenhNhanToiDa),
      trangThaiLamViec = VALUES(trangThaiLamViec)
      -- cố ý KHÔNG cập nhật nguoiTao/ngayTao khi bị upsert
  `;
  const res = await q(sql, [idBacSi, idPhongKham, idCaLamViec, ngayLamViec,
    soLuongBenhNhanToiDa, trangThaiLamViec, nguoiTao]);
  return { affected: res.affectedRows };
}

/** Generate nhiều LLV trong transaction (giữ nguoiTao) */
export async function generateWorkshifts({
  idBacSi, idPhongKham, from, to, idCaLamViecList = [],
  soLuongBenhNhanToiDa = 20, trangThaiLamViec = 1,
  nguoiTao = null
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sql = `
      INSERT INTO ${T}
        (idBacSi, idPhongKham, idCaLamViec, ngayLamViec,
         soLuongBenhNhanToiDa, soLuongDaDangKy, trangThaiLamViec,
         nguoiTao)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      ON DUPLICATE KEY UPDATE
        idPhongKham = VALUES(idPhongKham),
        soLuongBenhNhanToiDa = VALUES(soLuongBenhNhanToiDa),
        trangThaiLamViec = VALUES(trangThaiLamViec)
    `;

    const start = new Date(from);
    const end   = new Date(to);
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ngayLamViec = d.toISOString().slice(0, 10);
      for (const idCaLamViec of idCaLamViecList) {
        await conn.query(sql, [
          idBacSi, idPhongKham, idCaLamViec, ngayLamViec,
          soLuongBenhNhanToiDa, trangThaiLamViec, nguoiTao
        ]);
        count++;
      }
    }

    await conn.commit();
    conn.release();
    return { created: count };
  } catch (e) {
    await conn.rollback();
    conn.release();
    throw e;
  }
}

/** Cập nhật LLV (PUT) — nhận đúng tên cột DB */
export async function updateWorkshift(idLichLamViec, patch = {}) {
  const allow = [
    "idBacSi", "idPhongKham", "idCaLamViec",
    "ngayLamViec",
    "soLuongBenhNhanToiDa",
    "trangThaiLamViec",
    "ghiChu"
  ];
  const fields = [], vals = [];
  for (const k of allow) if (patch[k] !== undefined) { fields.push(`${k}=?`); vals.push(patch[k]); }
  if (!fields.length) return { affected: 0 };

  vals.push(Number(idLichLamViec));
  const sql = `UPDATE ${T} SET ${fields.join(", ")} WHERE idLichLamViec = ?`;
  const res = await q(sql, vals);
  return { affected: res.affectedRows };
}

/** Xoá LLV khi chưa có người đặt */
export async function deleteWorkshift(idLichLamViec) {
  const chk = await q(`SELECT soLuongDaDangKy FROM ${T} WHERE idLichLamViec = ?`, [idLichLamViec]);
  if (!chk.length) return { affected: 0 };
  if (Number(chk[0].soLuongDaDangKy) > 0) {
    const e = new Error("WORKSHIFT_HAS_BOOKINGS");
    e.status = 409;
    throw e;
  }
  const res = await q(`DELETE FROM ${T} WHERE idLichLamViec = ?`, [idLichLamViec]);
  return { affected: res.affectedRows };
}
