import { pool } from "../../config/db.js";

const T = "lichlamviec";

/* helper */
const q = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

/* ===== FE / Doctor-facing ===== */

/** Ngày có ca & còn chỗ trong tháng (tổng theo ngày) — alias giữ đúng tên cột DB */
export async function findWorkingDaysByDoctorMonth(maBacSi, firstDay, lastDay) {
  const sql = `
    SELECT
      llv.ngayLamViec,
      SUM(llv.soLuongBenhNhanToiDa) AS soLuongBenhNhanToiDa,
      SUM(llv.soLuongDaDangKy)      AS soLuongDaDangKy
    FROM ${T} llv
    WHERE llv.maBacSi = ?
      AND llv.trangThaiLamViec = 1
      AND llv.ngayLamViec BETWEEN ? AND ?
      AND llv.soLuongDaDangKy < llv.soLuongBenhNhanToiDa
    GROUP BY llv.ngayLamViec
    ORDER BY llv.ngayLamViec ASC
  `;
  return q(sql, [maBacSi, firstDay, lastDay]);
}

/** Các ca còn chỗ trong một ngày — field đúng tên cột DB */
export async function findShiftsByDoctorDate(maBacSi, ngayLamViec) {
  const sql = `
    SELECT
      llv.maLichLamViec,
      llv.maBacSi,
      llv.maPhongKham,
      pk.tenPhongKham,
      llv.maCaLamViec,
      clv.tenCaLamViec,
      clv.gioVao, clv.gioRa,
      llv.ngayLamViec,
      llv.soLuongBenhNhanToiDa,
      llv.soLuongDaDangKy,
      llv.trangThaiLamViec,
      llv.ngayTao,
      llv.nguoiTao
    FROM ${T} llv
    JOIN phongkham pk  ON pk.maPhongKham  = llv.maPhongKham
    JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
    WHERE llv.maBacSi = ?
      AND llv.ngayLamViec = ?
      AND llv.trangThaiLamViec = 1
      AND llv.soLuongDaDangKy < llv.soLuongBenhNhanToiDa
    ORDER BY clv.gioVao ASC
  `;
  return q(sql, [maBacSi, ngayLamViec]);
}

/* ===== Admin/Doctor listing ===== */
export async function listWorkshifts({
  maBacSi,
  maPhongKham,
  from,
  to,
  trangThaiLamViec,
  limit = 50,
  offset = 0
}) {
  const conds = [];
  const vals = [];
  if (maBacSi)         { conds.push("llv.maBacSi = ?");          vals.push(String(maBacSi)); }
  if (maPhongKham)     { conds.push("llv.maPhongKham = ?");      vals.push(String(maPhongKham)); }
  if (from)            { conds.push("llv.ngayLamViec >= ?");     vals.push(from); }
  if (to)              { conds.push("llv.ngayLamViec <= ?");     vals.push(to); }
  if (trangThaiLamViec !== undefined && trangThaiLamViec !== null &&
     trangThaiLamViec !== "" && trangThaiLamViec !== "ALL" &&
    Number.isFinite(Number(trangThaiLamViec))) {
    conds.push("llv.trangThaiLamViec = ?");
    vals.push(Number(trangThaiLamViec));
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const baseSelect = `
    FROM ${T} llv
    JOIN bacsi b       ON b.maBacSi       = llv.maBacSi
    JOIN nhanvien nv   ON nv.maNhanVien   = b.maNhanVien
    JOIN phongkham pk  ON pk.maPhongKham  = llv.maPhongKham
    JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
    ${where}
  `;

  // total
  const [cntRows] = await pool.query(`SELECT COUNT(*) AS n ${baseSelect}`, vals);
  const total = Number(cntRows[0]?.n || 0);

  // page
  const [rows] = await pool.query(
    `SELECT
      llv.maLichLamViec,
      llv.maBacSi, nv.hoTen AS tenBacSi,
      llv.maPhongKham, pk.tenPhongKham,
      llv.maCaLamViec, clv.tenCaLamViec, clv.gioVao, clv.gioRa,
      llv.ngayLamViec,
      llv.soLuongBenhNhanToiDa,
      llv.soLuongDaDangKy,
      llv.trangThaiLamViec,
      llv.ngayTao,
      llv.nguoiTao
     ${baseSelect}
     ORDER BY llv.ngayLamViec DESC, clv.gioVao ASC
     LIMIT ? OFFSET ?`,
    [...vals, Number(limit), Number(offset)]
  );

  return { items: rows, total };
}

/** Tạo 1 LLV (giữ nguoiTao, để DB tự set ngayTao) */
export async function insertWorkshift({
  maBacSi, maPhongKham, maCaLamViec, ngayLamViec,
  soLuongBenhNhanToiDa = 20, trangThaiLamViec = 1,
  nguoiTao = null
}) {
  const sql = `
    INSERT INTO ${T}
      (maBacSi, maPhongKham, maCaLamViec, ngayLamViec,
       soLuongBenhNhanToiDa, soLuongDaDangKy, trangThaiLamViec,
       nguoiTao)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ON DUPLICATE KEY UPDATE
      maPhongKham = VALUES(maPhongKham),
      soLuongBenhNhanToiDa = VALUES(soLuongBenhNhanToiDa),
      trangThaiLamViec = VALUES(trangThaiLamViec)
      -- KHÔNG cập nhật nguoiTao/ngayTao khi upsert
  `;
  const res = await q(sql, [maBacSi, maPhongKham, maCaLamViec, ngayLamViec,
    soLuongBenhNhanToiDa, trangThaiLamViec, nguoiTao]);
  return { affected: res.affectedRows };
}

/** Generate nhiều LLV trong transaction (giữ nguoiTao) */
export async function generateWorkshifts({
  maBacSi, maPhongKham, from, to, maCaLamViecList = [],
  soLuongBenhNhanToiDa = 20, trangThaiLamViec = 1,
  nguoiTao = null
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sql = `
      INSERT INTO ${T}
        (maBacSi, maPhongKham, maCaLamViec, ngayLamViec,
         soLuongBenhNhanToiDa, soLuongDaDangKy, trangThaiLamViec,
         nguoiTao)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      ON DUPLICATE KEY UPDATE
        maPhongKham = VALUES(maPhongKham),
        soLuongBenhNhanToiDa = VALUES(soLuongBenhNhanToiDa),
        trangThaiLamViec = VALUES(trangThaiLamViec)
    `;

    const start = new Date(from);
    const end   = new Date(to);
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ngayLamViec = d.toISOString().slice(0, 10);
      for (const maCaLamViec of maCaLamViecList) {
        await conn.query(sql, [
          maBacSi, maPhongKham, maCaLamViec, ngayLamViec,
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
export async function updateWorkshift(maLichLamViec, patch = {}) {
  const allow = [
    "maBacSi", "maPhongKham", "maCaLamViec",
    "ngayLamViec",
    "soLuongBenhNhanToiDa",
    "trangThaiLamViec",
    "ghiChu"
  ];
  const fields = [], vals = [];
  for (const k of allow) if (patch[k] !== undefined) { fields.push(`${k}=?`); vals.push(patch[k]); }
  if (!fields.length) return { affected: 0 };

  vals.push(String(maLichLamViec));
  const sql = `UPDATE ${T} SET ${fields.join(", ")} WHERE maLichLamViec = ?`;
  const res = await q(sql, vals);
  return { affected: res.affectedRows };
}

/** Xoá LLV khi chưa có người đặt */
export async function deleteWorkshift(maLichLamViec) {
  const chk = await q(`SELECT soLuongDaDangKy FROM ${T} WHERE maLichLamViec = ?`, [maLichLamViec]);
  if (!chk.length) return { affected: 0 };
  if (Number(chk[0].soLuongDaDangKy) > 0) {
    const e = new Error("WORKSHIFT_HAS_BOOKINGS");
    e.status = 409;
    throw e;
  }
  const res = await q(`DELETE FROM ${T} WHERE maLichLamViec = ?`, [maLichLamViec]);
  return { affected: res.affectedRows };
}
