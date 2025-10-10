import { pool } from "../../config/db.js";

const T_ORDER = "donhang";
const T_EVENT = "webhooksepayevent";

export const PaymentModel = {
  async getAppointmentInfo(maLichHen, conn = pool) {
    const [rows] = await conn.query(
      `SELECT l.*, b.soCCCD
         FROM lichhen l
         LEFT JOIN benhnhan b ON b.maBenhNhan = l.maBenhNhan
        WHERE l.maLichHen=? LIMIT 1`,
      [maLichHen]
    );
    return rows[0] || null;
  },

  // INSERT … ON DUP theo maLichHen (cần UNIQUE(maLichHen))
  async upsertByAppointment({ maLichHen, referenceCode, soTien, qrUrl, ghiChu }, conn = pool) {
    await conn.query(
      `INSERT INTO ${T_ORDER}
          (maLichHen, referenceCode, soTien, qrUrl, gateway, trangThai, ghiChu)
       VALUES (?, ?, ?, ?, 'SEPAY', 0, ?)
       ON DUPLICATE KEY UPDATE
          referenceCode=VALUES(referenceCode),
          soTien=VALUES(soTien),
          qrUrl=VALUES(qrUrl),
          trangThai=0,
          ghiChu=VALUES(ghiChu),
          createdAt=CURRENT_TIMESTAMP`,
      [maLichHen, referenceCode, soTien, qrUrl, ghiChu]
    );
  },

  async findSimpleByMa(maDonHang, conn = pool) {
    const [rows] = await conn.query(
      `SELECT maDonHang, maLichHen, soTien, trangThai, qrUrl, ghiChu, createdAt, paidAt
         FROM ${T_ORDER}
        WHERE maDonHang=? LIMIT 1`,
      [maDonHang]
    );
    return rows[0] || null;
  },

  async listByAppointment(maLichHen) {
    const [rows] = await pool.query(
      `SELECT d.*, d.trangThai AS dhTrangThai,
              l.*, l.trangThai AS lhTrangThai,
              b.soCCCD
         FROM ${T_ORDER} d
         JOIN lichhen   l ON l.maLichHen   = d.maLichHen
         LEFT JOIN benhnhan b ON b.maBenhNhan = l.maBenhNhan
        WHERE d.maLichHen=?
        ORDER BY d.createdAt DESC, d.maDonHang DESC`,
      [maLichHen]
    );
    return rows;
  },

  // trả về **maDonHang** để FE poll
  async findByReference(referenceCode, conn = pool) {
    const [rows] = await conn.query(
      `SELECT maDonHang, maLichHen, soTien, trangThai
         FROM ${T_ORDER}
        WHERE UPPER(referenceCode)=UPPER(?) LIMIT 1`,
      [referenceCode]
    );
    return rows[0] || null;
  },

  async findLatestByAppointment(maLichHen, conn = pool) {
    const [rows] = await conn.query(
      `SELECT d.*, d.trangThai AS dhTrangThai,
              l.*, l.trangThai AS lhTrangThai,
              b.soCCCD
         FROM ${T_ORDER} d
         JOIN lichhen   l ON l.maLichHen   = d.maLichHen
         LEFT JOIN benhnhan b ON b.maBenhNhan = l.maBenhNhan
        WHERE d.maLichHen=?
        ORDER BY d.createdAt DESC, d.maDonHang DESC
        LIMIT 1`,
      [maLichHen]
    );
    return rows[0] || null;
  },

  // 🔁 set PAID theo **mã đơn hàng**
  async markPaid(maDonHang, conn = pool) {
    const [rs] = await conn.query(
      `UPDATE ${T_ORDER}
          SET trangThai=1, paidAt=NOW(),
              ghiChu=CONCAT(COALESCE(ghiChu,''),' | paid:webhook')
        WHERE maDonHang=?`,
      [maDonHang]
    );
    return rs.affectedRows || 0;
  },

  async logWebhook({ httpStatus, body, overrideRef = null }, conn = pool) {
    const b = body || {};
    const refToSave = overrideRef || b.referenceCode || null;
    try {
      await conn.query(
        `INSERT INTO ${T_EVENT}
         (httpStatus, rawJson, gateway, transactionDate, accountNumber, subAccount,
          transferType, description, transferAmount, referenceCode, accumulated, content)
         VALUES (?, CAST(? AS JSON), 'SEPAY', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          httpStatus, JSON.stringify(b),
          b.transactionDate || null,
          b.accountNumber || null,
          b.subAccount || null,
          b.transferType || null,
          b.description || null,
          b.transferAmount || null,
          refToSave,
          b.accumulated || null,
          b.content || null,
        ]
      );
    } catch {}
  },

  //  List tất cả đơn (filter + phân trang) — chỉ các cột yêu cầu
  async listAllSimple({ q = "", status = null, limit = 20, offset = 0 }) {
    const where = [];
    const params = [];

    if (q) {
      where.push("(maDonHang LIKE ? OR referenceCode LIKE ? OR maLichHen LIKE ? OR CONCAT('LH', maLichHen) LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status !== null && status !== undefined && String(status) !== "") {
      where.push("trangThai = ?");
      params.push(Number(status));
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT maDonHang, maLichHen, soTien, trangThai, qrUrl, ghiChu, createdAt, paidAt
         FROM ${T_ORDER}
         ${whereSql}
        ORDER BY createdAt DESC, maDonHang DESC
        LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${T_ORDER} ${whereSql}`,
      params
    );

    return { items: rows, total: Number(total || 0) };
  },
};
