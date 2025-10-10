import { pool } from "../../config/db.js";

const T_ORDER = "donhang";

export const AnalyticModel = {
  /**
   * Tính tổng theo khoảng thời gian (đã chuẩn hóa fromTS/toTS dạng 'YYYY-MM-DD HH:mm:ss')
   * - revenuePaid: SUM(soTien) where trangThai=1 AND paidAt in range
   * - revenueUnpaid: SUM(soTien) where trangThai=0 AND createdAt in range
   * - ordersTotal: COUNT(*) where createdAt in range
   * - ordersPaid: COUNT where trangThai=1 AND paidAt in range
   * - ordersUnpaid: COUNT where trangThai=0 AND createdAt in range
   */
  async summaryRange({ fromTS, toTS }) {
    const params = [
      fromTS, toTS,  // revenuePaid
      fromTS, toTS,  // revenueUnpaid
      fromTS, toTS,  // ordersTotal
      fromTS, toTS,  // ordersPaid
      fromTS, toTS,  // ordersUnpaid
    ];

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
      ordersTotal: 0, ordersPaid: 0, ordersUnpaid: 0
    };
  },
};
