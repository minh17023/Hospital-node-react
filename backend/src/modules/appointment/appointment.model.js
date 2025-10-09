import { pool } from "../../config/db.js";

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

export const AppointmentModel = {
  /* ===== Shifts (LichLamViec + CaLamViec) ===== */
  async getShiftById(maLichLamViec) {
    const [rows] = await pool.query(
      `SELECT llv.*, clv.tenCaLamViec, clv.gioVao, clv.gioRa
         FROM lichlamviec llv
         JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maLichLamViec=? LIMIT 1`,
      [maLichLamViec]
    );
    return rows[0] || null;
  },

  async findShiftByDoctorDateTime(maBacSi, ngayISO, gioVao) {
    const [rows] = await pool.query(
      `SELECT llv.maLichLamViec
         FROM lichlamviec llv
         JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maBacSi=? AND llv.ngayLamViec=? AND clv.gioVao=? LIMIT 1`,
      [maBacSi, ngayISO, gioVao]
    );
    return rows[0]?.maLichLamViec || null;
  },

  async findOpenShiftForDoctor(maBacSi, ngayISO, gioNow) {
    const [rows] = await pool.query(
      `SELECT llv.maLichLamViec, llv.soLuongBenhNhanToiDa,
              clv.gioVao, clv.gioRa
         FROM lichlamviec llv
         JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
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
         FROM lichhen
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
         FROM lichlamviec llv
         JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maLichLamViec=?`,
      [maLichLamViec]
    );
    const meta = metaRows[0];
    if (!meta) return 0;

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n
         FROM lichhen
        WHERE maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1`,
      [meta.maBacSi, meta.ngayLamViec, meta.gioVao]
    );
    return Number(rows[0]?.n || 0);
  },

  async incShift(maLichLamViec, delta) {
    await pool.query(
      "UPDATE lichlamviec SET soLuongDaDangKy = GREATEST(0, soLuongDaDangKy + ?) WHERE maLichLamViec=?",
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

    await pool.query(
      `INSERT INTO lichhen
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

    const [rows] = await pool.query(
      `SELECT maLichHen FROM lichhen
        WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=? AND gioHen=?
        ORDER BY maLichHen DESC LIMIT 1`,
      [maBenhNhan, maBacSi, ngayHen, gioHen]
    );
    return rows[0]?.maLichHen || null;
  },

  // Trả luôn tên phòng/ca (đã ép collation ở ON)
  async getById(ma) {
    const [rows] = await pool.query(
      `SELECT lh.*,
              bn.hoTen        AS tenBenhNhan,
              nv.hoTen        AS tenBacSi,
              ck.tenChuyenKhoa,
              pk.tenPhongKham,
              clv.tenCaLamViec
         FROM lichhen lh
    LEFT JOIN benhnhan   bn ON bn.maBenhNhan   = lh.maBenhNhan
    LEFT JOIN bacsi      bs ON bs.maBacSi      = lh.maBacSi
    LEFT JOIN nhanvien   nv ON nv.maNhanVien   = bs.maNhanVien
    LEFT JOIN chuyenkhoa ck ON ck.maChuyenKhoa = lh.maChuyenKhoa
    LEFT JOIN lichlamviec llv
           ON llv.maBacSi     
            = lh.maBacSi     
          AND llv.ngayLamViec = lh.ngayHen
    LEFT JOIN calamviec clv
           ON clv.maCaLamViec = llv.maCaLamViec
          AND lh.gioHen >= clv.gioVao AND lh.gioHen < clv.gioRa
    LEFT JOIN phongkham pk
           ON pk.maPhongKham  
            = llv.maPhongKham 
        WHERE lh.maLichHen=? LIMIT 1`,
      [ma]
    );
    return rows[0] || null;
  },

  async listByPatient(
    maBenhNhan,
    { from = null, to = null, status = "ALL", limit = 50, offset = 0 } = {}
  ) {
    const where = ["lh.maBenhNhan=?"];
    const params = [maBenhNhan];

    if (isIsoDate(from)) { where.push("lh.ngayHen >= ?"); params.push(from); }
    if (isIsoDate(to))   { where.push("lh.ngayHen <= ?"); params.push(to); }

    const st = String(status ?? "ALL").toUpperCase();
    if (/^[\-]?\d+$/.test(String(status))) {
      where.push("lh.trangThai=?"); params.push(Number(status));
    } else if (st === "ACTIVE") {
      where.push("lh.trangThai<>-1");
    } else if (st === "CANCELED") {
      where.push("lh.trangThai=-1");
    }

    const [rows] = await pool.query(
      `SELECT lh.*,
              nv.hoTen AS tenBacSi,
              ck.tenChuyenKhoa,
              pk.tenPhongKham,
              S.tenCaLamViec
         FROM lichhen lh
    LEFT JOIN bacsi      bs  ON bs.maBacSi      = lh.maBacSi
    LEFT JOIN nhanvien   nv  ON nv.maNhanVien   = bs.maNhanVien
    LEFT JOIN chuyenkhoa ck  ON ck.maChuyenKhoa = lh.maChuyenKhoa
    LEFT JOIN (
      SELECT llv.maLichLamViec, llv.maBacSi, llv.ngayLamViec, llv.maPhongKham,
             clv.maCaLamViec, clv.tenCaLamViec, clv.gioVao, clv.gioRa
        FROM lichlamviec llv
        JOIN calamviec  clv ON clv.maCaLamViec = llv.maCaLamViec
    ) AS S
      ON S.maBacSi     
       = lh.maBacSi    
     AND S.ngayLamViec = lh.ngayHen
     AND lh.gioHen >= S.gioVao AND lh.gioHen < S.gioRa
    LEFT JOIN phongkham  pk
      ON pk.maPhongKham 
       = S.maPhongKham 
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
         FROM lichlamviec llv
         JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maLichLamViec=?`,
      [maLichLamViec]
    );
    const meta = metaRows[0];
    if (!meta) return null;

    const [rows] = await pool.query(
      `SELECT maLichHen
         FROM lichhen
        WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1
        LIMIT 1`,
      [maBenhNhan, meta.maBacSi, meta.ngayLamViec, meta.gioVao]
    );
    return rows[0] || null;
  },

  async findDuplicateWalkin(maBenhNhan, maBacSi, ngayISO) {
    const [rows] = await pool.query(
      `SELECT maLichHen
         FROM lichhen
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
         FROM lichhen
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
              nv.hoTen AS tenBacSi, ck.tenChuyenKhoa,
              pk.tenPhongKham, clv.tenCaLamViec
         FROM lichhen lh
    LEFT JOIN bacsi      bs  ON bs.maBacSi      = lh.maBacSi
    LEFT JOIN nhanvien   nv  ON nv.maNhanVien   = bs.maNhanVien
    LEFT JOIN chuyenkhoa ck  ON ck.maChuyenKhoa = lh.maChuyenKhoa
    LEFT JOIN lichlamviec llv
           ON llv.maBacSi     
            = lh.maBacSi      
          AND llv.ngayLamViec = lh.ngayHen
    LEFT JOIN calamviec clv
           ON clv.maCaLamViec = llv.maCaLamViec
          AND lh.gioHen >= clv.gioVao AND lh.gioHen < clv.gioRa
    LEFT JOIN phongkham  pk
           ON pk.maPhongKham  
            = llv.maPhongKham 
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
         FROM lichlamviec llv
         JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
        WHERE llv.maBacSi=? AND llv.ngayLamViec=?
          AND clv.gioVao <= ? AND ? < clv.gioRa
        LIMIT 1`,
      [maBacSi, ngayISO, gioAny, gioAny]
    );
    return rows[0]?.maLichLamViec || null;
  },

  async updateStatus(ma, trangThai) {
    await pool.query("UPDATE lichhen SET trangThai=? WHERE maLichHen=?", [trangThai, ma]);
  },

  async cancelAndCompact(conn, maLichHen) {
    const [[curr]] = await conn.query(
      `SELECT * FROM lichhen WHERE maLichHen=? FOR UPDATE`, [maLichHen]
    );
    if (!curr) return { changed: 0, appt: null };
    if (Number(curr.trangThai) === -1) return { changed: 0, appt: curr };

    await conn.query("UPDATE lichhen SET trangThai=-1 WHERE maLichHen=?", [maLichHen]);

    await conn.query(
      `UPDATE lichhen
          SET sttKham = sttKham - 1
        WHERE maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1 AND sttKham > ?`,
      [curr.maBacSi, curr.ngayHen, curr.gioHen, curr.sttKham]
    );

    return { changed: 1, appt: curr };
  },

  /* ===== Giá ===== */
  async getDoctorFee(maBacSi) {
    const [rows] = await pool.query(
      `SELECT phiKham FROM bacsi WHERE maBacSi=? LIMIT 1`,
      [maBacSi]
    );
    return Number(rows[0]?.phiKham || 0);
  },

  async hasValidBHYTByPatient(maBenhNhan) {
    const [rows] = await pool.query(
      `SELECT 1
         FROM baohiemyte
        WHERE maBenhNhan=? AND trangThai=1
          AND DATE(denNgay) >= CURDATE()
        LIMIT 1`,
      [maBenhNhan]
    );
    return !!rows.length;
  }
};
