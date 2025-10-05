import { pool } from "../../config/db.js";

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

export const AppointmentModel = {
  /* ===== Shifts (LichLamViec + CaLamViec) ===== */
  async getShiftById(maLichLamViec) {
    const [rows] = await pool.query(
      `SELECT llv.*, clv.tenCaLamViec, clv.gioVao, clv.gioRa
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maLichLamViec=? LIMIT 1`,
      [maLichLamViec]
    );
    return rows[0] || null;
  },

  async findShiftByDoctorDateTime(maBacSi, ngayISO, gioVao) {
    const [rows] = await pool.query(
      `SELECT llv.maLichLamViec
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maBacSi=? AND llv.ngayLamViec=? AND clv.gioVao=? LIMIT 1`,
      [maBacSi, ngayISO, gioVao]
    );
    return rows[0]?.maLichLamViec || null;
  },

  async findOpenShiftForDoctor(maBacSi, ngayISO, gioNow) {
    const [rows] = await pool.query(
      `SELECT llv.maLichLamViec, llv.soLuongBenhNhanToiDa,
              clv.gioVao, clv.gioRa
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maBacSi=? AND llv.ngayLamViec=?
          AND clv.gioVao <= ? AND ? < clv.gioRa
        LIMIT 1`,
      [maBacSi, ngayISO, gioNow, gioNow]
    );
    return rows[0] || null;
  },

  async countInWindow(maBacSi, ngayISO, gioVao, gioRa) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) n
         FROM LichHen
        WHERE maBacSi=? AND ngayHen=?
          AND gioHen >= ? AND gioHen < ?
          AND trangThai<>-1`,
      [maBacSi, ngayISO, gioVao, gioRa]
    );
    return Number(rows[0]?.n || 0);
  },

  async countInShift(maLichLamViec) {
    const [metaRows] = await pool.query(
      `SELECT llv.maBacSi, llv.ngayLamViec, clv.gioVao
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maLichLamViec=?`,
      [maLichLamViec]
    );
    const meta = metaRows[0];
    if (!meta) return 0;

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n
         FROM LichHen
        WHERE maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1`,
      [meta.maBacSi, meta.ngayLamViec, meta.gioVao]
    );
    return Number(rows[0]?.n || 0);
  },

  async incShift(maLichLamViec, delta) {
    await pool.query(
      "UPDATE LichLamViec SET soLuongDaDangKy = GREATEST(0, soLuongDaDangKy + ?) WHERE maLichLamViec=?",
      [delta, maLichLamViec]
    );
  },

  /* ===== Appointments (LichHen) ===== */
  async insert(appt) {
    const {
      maBenhNhan, maBacSi, maChuyenKhoa,
      ngayHen, gioHen, loaiKham, lyDoKham = null,
      hinhThuc, trangThai, sttKham = null,
      phiKhamGoc = null, phiDaGiam = null
    } = appt;

    // Trigger sẽ sinh maLichHen
    await pool.query(
      `INSERT INTO LichHen
       (maBenhNhan, maBacSi, maChuyenKhoa, ngayHen, gioHen,
        loaiKham, lyDoKham, hinhThuc, trangThai, sttKham,
        phiKhamGoc, phiDaGiam, ngayTao)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW())`,
      [
        maBenhNhan, maBacSi, maChuyenKhoa, ngayHen, gioHen,
        loaiKham, lyDoKham, hinhThuc, trangThai, sttKham,
        phiKhamGoc, phiDaGiam
      ]
    );
    // lấy lại theo key tự nhiên
    const [rows] = await pool.query(
      `SELECT maLichHen FROM LichHen
        WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=? AND gioHen=?
        ORDER BY maLichHen DESC LIMIT 1`,
      [maBenhNhan, maBacSi, ngayHen, gioHen]
    );
    return rows[0]?.maLichHen || null;
  },

  // Trả luôn tên phòng/ca
  async getById(ma) {
    const [rows] = await pool.query(
      `SELECT lh.*,
              bn.hoTen        AS tenBenhNhan,
              bs.tenBacSi     AS tenBacSi,
              ck.tenChuyenKhoa,
              pk.tenPhongKham,
              clv.tenCaLamViec
         FROM LichHen lh
    LEFT JOIN BenhNhan   bn ON bn.maBenhNhan   = lh.maBenhNhan
    LEFT JOIN BacSi      bs ON bs.maBacSi      = lh.maBacSi
    LEFT JOIN ChuyenKhoa ck ON ck.maChuyenKhoa = lh.maChuyenKhoa
    /* map phòng/ca theo (bác sĩ, ngày) và time window */
    LEFT JOIN LichLamViec llv
           ON llv.maBacSi = lh.maBacSi
          AND llv.ngayLamViec = lh.ngayHen
    LEFT JOIN CaLamViec clv
           ON clv.maCaLamViec = llv.maCaLamViec
          AND lh.gioHen >= clv.gioVao AND lh.gioHen < clv.gioRa
    LEFT JOIN PhongKham pk ON pk.maPhongKham = llv.maPhongKham
        WHERE lh.maLichHen=? LIMIT 1`,
      [ma]
    );
    return rows[0] || null;
  },

  async listByPatient(
    maBenhNhan,
    { from = null, to = null, status = "ALL", limit = 50, offset = 0 } = {}
  ) {
    const where = ["lh.maBenhNhan=?"];         // ❗️bỏ mặc định trangThai<>-1
    const params = [maBenhNhan];
  
    if (isIsoDate(from)) { where.push("lh.ngayHen >= ?"); params.push(from); }
    if (isIsoDate(to))   { where.push("lh.ngayHen <= ?"); params.push(to); }
  
    // status xử lý linh hoạt
    const st = String(status ?? "ALL").toUpperCase();
    if (/^[\-]?\d+$/.test(String(status))) {
      where.push("lh.trangThai=?"); params.push(Number(status));
    } else if (st === "ACTIVE") {
      where.push("lh.trangThai<>-1");
    } else if (st === "CANCELED") {
      where.push("lh.trangThai=-1");
    }
    // st === "ALL" -> không thêm điều kiện trạng thái (trả tất cả)
  
    const [rows] = await pool.query(
      `SELECT lh.*,
              bs.tenBacSi,
              ck.tenChuyenKhoa,
              pk.tenPhongKham,
              S.tenCaLamViec
         FROM LichHen lh
    LEFT JOIN BacSi      bs  ON bs.maBacSi      = lh.maBacSi
    LEFT JOIN ChuyenKhoa ck  ON ck.maChuyenKhoa = lh.maChuyenKhoa
    /* Only-one-match shift by time window */
    LEFT JOIN (
      SELECT llv.maLichLamViec, llv.maBacSi, llv.ngayLamViec, llv.maPhongKham,
             clv.maCaLamViec, clv.tenCaLamViec, clv.gioVao, clv.gioRa
        FROM LichLamViec llv
        JOIN CaLamViec  clv ON clv.maCaLamViec = llv.maCaLamViec
    ) AS S
      ON S.maBacSi=lh.maBacSi AND S.ngayLamViec=lh.ngayHen
     AND lh.gioHen >= S.gioVao AND lh.gioHen < S.gioRa
    LEFT JOIN PhongKham  pk  ON pk.maPhongKham  = S.maPhongKham
        WHERE ${where.join(" AND ")}
        ORDER BY lh.ngayHen DESC, lh.gioHen DESC
        LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return rows;
  },  

  async findDuplicateOnline(maBenhNhan, maLichLamViec) {
    const [metaRows] = await pool.query(
      `SELECT llv.maBacSi, llv.ngayLamViec, clv.gioVao
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maLichLamViec=?`,
      [maLichLamViec]
    );
    const meta = metaRows[0];
    if (!meta) return null;

    const [rows] = await pool.query(
      `SELECT maLichHen
         FROM LichHen
        WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1
        LIMIT 1`,
      [maBenhNhan, meta.maBacSi, meta.ngayLamViec, meta.gioVao]
    );
    return rows[0] || null;
  },

  async findDuplicateWalkin(maBenhNhan, maBacSi, ngayISO) {
    const [rows] = await pool.query(
      `SELECT maLichHen
         FROM LichHen
        WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=? AND trangThai<>-1
          AND hinhThuc=1
        LIMIT 1`,
      [maBenhNhan, maBacSi, ngayISO]
    );
    return rows[0] || null;
  },

  async todayMaxSttDoctor(maBacSi, ngayISO) {
    const [rows] = await pool.query(
      `SELECT MAX(sttKham) AS maxStt
         FROM LichHen
        WHERE maBacSi=? AND ngayHen=? AND trangThai<>-1`,
      [maBacSi, ngayISO]
    );
    return Number(rows[0]?.maxStt || 0);
  },

  async list({ maBacSi = null, ngay = null, limit = 50, offset = 0 }) {
    const params = [];
    const where = ["lh.trangThai<>-1"];
    if (maBacSi) { where.push("lh.maBacSi=?"); params.push(maBacSi); }
    if (ngay)    { where.push("lh.ngayHen=?"); params.push(ngay);   }
  
    const [rows] = await pool.query(
      `SELECT lh.*,
              bs.tenBacSi, ck.tenChuyenKhoa,
              pk.tenPhongKham, clv.tenCaLamViec
         FROM LichHen lh
    LEFT JOIN BacSi      bs  ON bs.maBacSi      = lh.maBacSi
    LEFT JOIN ChuyenKhoa ck  ON ck.maChuyenKhoa = lh.maChuyenKhoa
    LEFT JOIN LichLamViec llv
           ON llv.maBacSi     = lh.maBacSi
          AND llv.ngayLamViec = lh.ngayHen
    LEFT JOIN CaLamViec clv
           ON clv.maCaLamViec = llv.maCaLamViec
          AND lh.gioHen >= clv.gioVao AND lh.gioHen < clv.gioRa
    LEFT JOIN PhongKham  pk  ON pk.maPhongKham  = llv.maPhongKham
        WHERE ${where.join(" AND ")}
        ORDER BY lh.ngayHen DESC, lh.gioHen DESC
        LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return rows;
  },

  async findShiftByDoctorDateAndTimeWindow(maBacSi, ngayISO, gioAny) {
    const [rows] = await pool.query(
      `SELECT llv.maLichLamViec
         FROM LichLamViec llv
         JOIN CaLamViec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maBacSi=? AND llv.ngayLamViec=?
          AND clv.gioVao <= ? AND ? < clv.gioRa
        LIMIT 1`,
      [maBacSi, ngayISO, gioAny, gioAny]
    );
    return rows[0]?.maLichLamViec || null;
  },

  async updateStatus(ma, trangThai) {
    await pool.query("UPDATE LichHen SET trangThai=? WHERE maLichHen=?", [trangThai, ma]);
  },

  async cancelAndCompact(conn, maLichHen) {
    const [[curr]] = await conn.query(
      `SELECT * FROM LichHen WHERE maLichHen=? FOR UPDATE`, [maLichHen]
    );
    if (!curr) return { changed: 0, appt: null };
    if (Number(curr.trangThai) === -1) return { changed: 0, appt: curr };

    await conn.query("UPDATE LichHen SET trangThai=-1 WHERE maLichHen=?", [maLichHen]);

    await conn.query(
      `UPDATE LichHen
          SET sttKham = sttKham - 1
        WHERE maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1 AND sttKham > ?`,
      [curr.maBacSi, curr.ngayHen, curr.gioHen, curr.sttKham]
    );

    return { changed: 1, appt: curr };
  },

  /* ===== Giá ===== */
  async getDoctorFee(maBacSi) {
    const [rows] = await pool.query(
      `SELECT phiKham FROM BacSi WHERE maBacSi=? LIMIT 1`,
      [maBacSi]
    );
    return Number(rows[0]?.phiKham || 0);
  },

  async hasValidBHYTByPatient(maBenhNhan) {
    const [rows] = await pool.query(
      `SELECT 1
         FROM BaoHiemYTe
        WHERE maBenhNhan=? AND trangThai=1
          AND DATE(denNgay) >= CURDATE()
        LIMIT 1`,
      [maBenhNhan]
    );
    return !!rows.length;
  }
};
