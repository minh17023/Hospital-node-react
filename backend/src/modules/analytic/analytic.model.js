import { pool } from "../../config/db.js";

const T_ORDER = "donhang";
const T_APPT  = "lichhen";
const T_SCH   = "lichlamviec"; 
const T_PAT   = "benhnhan";    

export const AnalyticModel = {
  async summaryRange({ fromTS, toTS }) {
    const params = [fromTS, toTS, fromTS, toTS, fromTS, toTS, fromTS, toTS, fromTS, toTS];
    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN trangThai=1 AND paidAt    BETWEEN ? AND ? THEN soTien ELSE 0 END),0) AS revenuePaid,
        COALESCE(SUM(CASE WHEN trangThai=0 AND createdAt BETWEEN ? AND ? THEN soTien ELSE 0 END),0) AS revenueUnpaid,
        COALESCE(SUM(CASE WHEN               createdAt BETWEEN ? AND ? THEN 1      ELSE 0 END),0) AS ordersTotal,
        COALESCE(SUM(CASE WHEN trangThai=1 AND paidAt    BETWEEN ? AND ? THEN 1      ELSE 0 END),0) AS ordersPaid,
        COALESCE(SUM(CASE WHEN trangThai=0 AND createdAt BETWEEN ? AND ? THEN 1      ELSE 0 END),0) AS ordersUnpaid
      FROM ${T_ORDER}
      `,
      params
    );
    return rows[0] || {
      revenuePaid: 0, revenueUnpaid: 0,
      ordersTotal: 0, ordersPaid: 0, ordersUnpaid: 0,
    };
  },
};

export const DoctorStatsModel = {
  /**
   * Trả về:
   * - counts: {inProgress, registered, done, noShow, cancelled}
   * - items: danh sách gọn nhẹ để FE show
   * - total: tổng lịch trong khoảng
   */
  async statsByDoctor({ maBacSi, from, to, limit = 10 }) {
    const [countRows] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN trangThai=1 THEN 1 ELSE 0 END),0)                                   AS inProgress,
        COALESCE(SUM(CASE WHEN trangThai=0 THEN 1 ELSE 0 END),0)                                   AS registered,
        COALESCE(SUM(CASE WHEN trangThai=2 THEN 1 ELSE 0 END),0)                                   AS done,
        COALESCE(SUM(CASE WHEN trangThai=3 OR trangThai=5 THEN 1 ELSE 0 END),0)                    AS noShow,
        COALESCE(SUM(CASE WHEN trangThai=-1 THEN 1 ELSE 0 END),0)                                  AS cancelled
      FROM ${T_APPT}
      WHERE maBacSi = ? AND ngayHen BETWEEN ? AND ?
      `,
      [String(maBacSi), from, to]
    );
    const counts = countRows?.[0] || { inProgress:0, registered:0, done:0, noShow:0, cancelled:0 };

    // Tổng số lịch
    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS n FROM ${T_APPT} WHERE maBacSi = ? AND ngayHen BETWEEN ? AND ?`,
      [String(maBacSi), from, to]
    );
    const total = Number(cnt?.[0]?.n || 0);

    // Danh sách rút gọn (sắp xếp theo ngày/giờ)
    const [items] = await pool.query(
      `
      SELECT
        lh.maLichHen, lh.trangThai, lh.ngayHen, lh.gioHen, lh.ngayTao,
        bn.maBenhNhan, bn.hoTen, bn.soDienThoai
      FROM ${T_APPT} lh
      JOIN ${T_PAT}  bn ON bn.maBenhNhan = lh.maBenhNhan
      WHERE lh.maBacSi = ? AND lh.ngayHen BETWEEN ? AND ?
      ORDER BY lh.ngayHen ASC, lh.gioHen ASC, lh.ngayTao ASC
      LIMIT ?
      `,
      [String(maBacSi), from, to, Number(limit)]
    );

    return { counts, items, total };
  },
};
