import { pool } from "../../config/db.js";

export const AppointmentModel = {
  /* ===== Shifts (LichLamViec + CaLamViec) ===== */
  async getShiftById(idLichLamViec) {
    const [rows] = await pool.query(
      `SELECT llv.*, clv.tenCaLamViec, clv.gioVao, clv.gioRa
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
        WHERE llv.idLichLamViec=? LIMIT 1`,
      [idLichLamViec]
    );
    return rows[0] || null;
  },

  async findShiftByDoctorDateTime(idBacSi, ngayISO, gioVao) {
    const [rows] = await pool.query(
      `SELECT llv.idLichLamViec
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
        WHERE llv.idBacSi=? AND llv.ngayLamViec=? AND clv.gioVao=? LIMIT 1`,
      [idBacSi, ngayISO, gioVao]
    );
    return rows[0]?.idLichLamViec || null;
  },

  async findOpenShiftForDoctor(idBacSi, ngayISO, gioNow) {
    const [rows] = await pool.query(
      `SELECT llv.idLichLamViec, llv.soLuongBenhNhanToiDa,
              clv.gioVao, clv.gioRa
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
        WHERE llv.idBacSi=? AND llv.ngayLamViec=?
          AND clv.gioVao <= ? AND ? < clv.gioRa
        LIMIT 1`,
      [idBacSi, ngayISO, gioNow, gioNow]
    );
    return rows[0] || null;
  },

  async countInWindow(idBacSi, ngayISO, gioVao, gioRa) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) n
         FROM LichHen
        WHERE idBacSi=? AND ngayHen=?
          AND gioHen >= ? AND gioHen < ?
          AND trangThai<>-1`,
      [idBacSi, ngayISO, gioVao, gioRa]
    );
    return Number(rows[0]?.n || 0);
  },

  async countInShift(idLichLamViec) {
    const [metaRows] = await pool.query(
      `SELECT llv.idBacSi, llv.ngayLamViec, clv.gioVao
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
        WHERE llv.idLichLamViec=?`,
      [idLichLamViec]
    );
    const meta = metaRows[0];
    if (!meta) return 0;

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n
         FROM LichHen
        WHERE idBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1`,
      [meta.idBacSi, meta.ngayLamViec, meta.gioVao]
    );
    return Number(rows[0]?.n || 0);
  },

  async incShift(idLichLamViec, delta) {
    await pool.query(
      "UPDATE LichLamViec SET soLuongDaDangKy = GREATEST(0, soLuongDaDangKy + ?) WHERE idLichLamViec=?",
      [delta, idLichLamViec]
    );
  },

  /* ===== Appointments (LichHen) ===== */
  async insert(appt) {
    const {
      idBenhNhan, idBacSi, idChuyenKhoa,
      ngayHen, gioHen, loaiKham, lyDoKham = null,
      hinhThuc, trangThai, sttKham = null,
      phiKhamGoc = null, phiDaGiam = null
    } = appt;

    const [rs] = await pool.query(
      `INSERT INTO LichHen
       (idBenhNhan, idBacSi, idChuyenKhoa, ngayHen, gioHen,
        loaiKham, lyDoKham, hinhThuc, trangThai, sttKham,
        phiKhamGoc, phiDaGiam, ngayTao)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW())`,
      [
        idBenhNhan, idBacSi, idChuyenKhoa, ngayHen, gioHen,
        loaiKham, lyDoKham, hinhThuc, trangThai, sttKham,
        phiKhamGoc, phiDaGiam
      ]
    );
    return rs.insertId;
  },

  async getById(id) {
    const [rows] = await pool.query(
      `SELECT lh.*,
              bn.hoTen        AS tenBenhNhan,
              bs.tenBacSi     AS tenBacSi,
              ck.tenChuyenKhoa
         FROM LichHen lh
    LEFT JOIN BenhNhan   bn ON bn.idBenhNhan   = lh.idBenhNhan
    LEFT JOIN BacSi      bs ON bs.idBacSi      = lh.idBacSi
    LEFT JOIN ChuyenKhoa ck ON ck.idChuyenKhoa = lh.idChuyenKhoa
        WHERE lh.idLichHen=? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async listByPatient(idBenhNhan, { limit = 50, offset = 0 } = {}) {
    const [rows] = await pool.query(
      `SELECT *
         FROM LichHen
        WHERE idBenhNhan=? AND trangThai<>-1
        ORDER BY ngayHen DESC, gioHen DESC
        LIMIT ? OFFSET ?`,
      [idBenhNhan, Number(limit), Number(offset)]
    );
    return rows;
  },

  async findDuplicateOnline(idBenhNhan, idLichLamViec) {
    const [metaRows] = await pool.query(
      `SELECT llv.idBacSi, llv.ngayLamViec, clv.gioVao
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
        WHERE llv.idLichLamViec=?`,
      [idLichLamViec]
    );
    const meta = metaRows[0];
    if (!meta) return null;

    const [rows] = await pool.query(
      `SELECT idLichHen
         FROM LichHen
        WHERE idBenhNhan=? AND idBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1
        LIMIT 1`,
      [idBenhNhan, meta.idBacSi, meta.ngayLamViec, meta.gioVao]
    );
    return rows[0] || null;
  },

  async findDuplicateWalkin(idBenhNhan, idBacSi, ngayISO) {
    const [rows] = await pool.query(
      `SELECT idLichHen
         FROM LichHen
        WHERE idBenhNhan=? AND idBacSi=? AND ngayHen=? AND trangThai<>-1
          AND hinhThuc=1
        LIMIT 1`,
      [idBenhNhan, idBacSi, ngayISO]
    );
    return rows[0] || null;
  },

  async todayMaxSttDoctor(idBacSi, ngayISO) {
    const [rows] = await pool.query(
      `SELECT MAX(sttKham) AS maxStt
         FROM LichHen
        WHERE idBacSi=? AND ngayHen=? AND trangThai<>-1`,
      [idBacSi, ngayISO]
    );
    return Number(rows[0]?.maxStt || 0);
  },

  async list({ idBacSi = null, ngay = null, limit = 50, offset = 0 }) {
    const params = [];
    const where = ["trangThai<>-1"];
    if (idBacSi) { where.push("idBacSi=?"); params.push(idBacSi); }
    if (ngay)    { where.push("ngayHen=?"); params.push(ngay);   }

    const [rows] = await pool.query(
      `SELECT * FROM LichHen
       WHERE ${where.join(" AND ")}
       ORDER BY ngayHen DESC, gioHen DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return rows;
  },

  async updateStatus(id, trangThai) {
    await pool.query("UPDATE LichHen SET trangThai=? WHERE idLichHen=?", [trangThai, id]);
  },

  async cancelAndCompact(conn, idLichHen) {
    const [[curr]] = await conn.query(
      `SELECT * FROM LichHen WHERE idLichHen=? FOR UPDATE`, [idLichHen]
    );
    if (!curr) return { changed: 0, appt: null };
    if (Number(curr.trangThai) === -1) return { changed: 0, appt: curr };

    await conn.query("UPDATE LichHen SET trangThai=-1 WHERE idLichHen=?", [idLichHen]);

    await conn.query(
      `UPDATE LichHen
          SET sttKham = sttKham - 1
        WHERE idBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1 AND sttKham > ?`,
      [curr.idBacSi, curr.ngayHen, curr.gioHen, curr.sttKham]
    );

    return { changed: 1, appt: curr };
  },

  /* ===== Giá ===== */
  async getDoctorFee(idBacSi) {
    const [rows] = await pool.query(
      `SELECT phiKham FROM BacSi WHERE idBacSi=? LIMIT 1`,
      [idBacSi]
    );
    return Number(rows[0]?.phiKham || 0);
  },

  async hasValidBHYTByPatient(idBenhNhan) {
    const [rows] = await pool.query(
      `SELECT 1
         FROM BaoHiemYTe
        WHERE idBenhNhan=? AND trangThai=1
          AND DATE(denNgay) >= CURDATE()
        LIMIT 1`,
      [idBenhNhan]
    );
    return !!rows.length;
  }
};
