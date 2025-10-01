import { pool } from "../../config/db.js";

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

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

  // Thay getById để trả luôn tên phòng
  async getById(id) {
    const [rows] = await pool.query(
      `SELECT lh.*,
              bn.hoTen        AS tenBenhNhan,
              bs.tenBacSi     AS tenBacSi,
              ck.tenChuyenKhoa,
              pk.tenPhongKham,
              clv.tenCaLamViec
        FROM LichHen lh
    LEFT JOIN BenhNhan   bn ON bn.idBenhNhan   = lh.idBenhNhan
    LEFT JOIN BacSi      bs ON bs.idBacSi      = lh.idBacSi
    LEFT JOIN ChuyenKhoa ck ON ck.idChuyenKhoa = lh.idChuyenKhoa
    /* map phòng/ca theo (bác sĩ, ngày) và time window */
    LEFT JOIN LichLamViec llv
          ON llv.idBacSi = lh.idBacSi
          AND llv.ngayLamViec = lh.ngayHen
    LEFT JOIN CaLamViec clv
          ON clv.idCaLamViec = llv.idCaLamViec
          AND lh.gioHen >= clv.gioVao AND lh.gioHen < clv.gioRa
    LEFT JOIN PhongKham pk ON pk.idPhongKham = llv.idPhongKham
        WHERE lh.idLichHen=? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async listByPatient(
    idBenhNhan,
    { from = null, to = null, status = "ALL", limit = 50, offset = 0 } = {}
  ) {
    const where = ["lh.idBenhNhan=?", "lh.trangThai<>-1"];
    const params = [idBenhNhan];

    if (isIsoDate(from)) { where.push("lh.ngayHen >= ?"); params.push(from); }
    if (isIsoDate(to))   { where.push("lh.ngayHen <= ?"); params.push(to); }

    // status: ALL | ACTIVE | CANCELED | số nguyên
    if (typeof status === "number" || /^[\-]?\d+$/.test(String(status))) {
      where.push("lh.trangThai=?"); params.push(Number(status));
    } else if (String(status).toUpperCase() === "CANCELED") {
      where.splice(where.indexOf("lh.trangThai<>-1"), 1); // bỏ điều kiện <>-1
      where.push("lh.trangThai=-1");
    } else if (String(status).toUpperCase() === "ACTIVE") {
      // đã có điều kiện <> -1 ở trên, không cần thêm gì
    }

    const [rows] = await pool.query(
      `SELECT lh.*,
              bs.tenBacSi,
              ck.tenChuyenKhoa,
              pk.tenPhongKham,
              S.tenCaLamViec
         FROM LichHen lh
    LEFT JOIN BacSi      bs  ON bs.idBacSi      = lh.idBacSi
    LEFT JOIN ChuyenKhoa ck  ON ck.idChuyenKhoa = lh.idChuyenKhoa
    /* Only-one-match shift by time window */
    LEFT JOIN (
      SELECT llv.idLichLamViec, llv.idBacSi, llv.ngayLamViec, llv.idPhongKham,
             clv.idCaLamViec, clv.tenCaLamViec, clv.gioVao, clv.gioRa
        FROM LichLamViec llv
        JOIN CaLamViec  clv ON clv.idCaLamViec = llv.idCaLamViec
    ) AS S
      ON S.idBacSi=lh.idBacSi AND S.ngayLamViec=lh.ngayHen
     AND lh.gioHen >= S.gioVao AND lh.gioHen < S.gioRa
    LEFT JOIN PhongKham  pk  ON pk.idPhongKham  = S.idPhongKham
        WHERE ${where.join(" AND ")}
        ORDER BY lh.ngayHen DESC, lh.gioHen DESC
        LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
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
    const where = ["lh.trangThai<>-1"];
    if (idBacSi) { where.push("lh.idBacSi=?"); params.push(idBacSi); }
    if (ngay)    { where.push("lh.ngayHen=?"); params.push(ngay);   }
  
    const [rows] = await pool.query(
      `SELECT lh.*,
              bs.tenBacSi, ck.tenChuyenKhoa,
              pk.tenPhongKham, clv.tenCaLamViec
         FROM LichHen lh
    LEFT JOIN BacSi      bs  ON bs.idBacSi      = lh.idBacSi
    LEFT JOIN ChuyenKhoa ck  ON ck.idChuyenKhoa = lh.idChuyenKhoa
    LEFT JOIN LichLamViec llv
           ON llv.idBacSi     = lh.idBacSi
          AND llv.ngayLamViec = lh.ngayHen
    LEFT JOIN CaLamViec clv
           ON clv.idCaLamViec = llv.idCaLamViec
          AND lh.gioHen >= clv.gioVao AND lh.gioHen < clv.gioRa
    LEFT JOIN PhongKham  pk  ON pk.idPhongKham  = llv.idPhongKham
        WHERE ${where.join(" AND ")}
        ORDER BY lh.ngayHen DESC, lh.gioHen DESC
        LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return rows;
  },

  async findShiftByDoctorDateAndTimeWindow(idBacSi, ngayISO, gioAny) {
    const [rows] = await pool.query(
      `SELECT llv.idLichLamViec
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
        WHERE llv.idBacSi=? AND llv.ngayLamViec=?
          AND clv.gioVao <= ? AND ? < clv.gioRa
        LIMIT 1`,
      [idBacSi, ngayISO, gioAny, gioAny]
    );
    return rows[0]?.idLichLamViec || null;
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
