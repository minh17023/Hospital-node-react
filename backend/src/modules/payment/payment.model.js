import { pool } from "../../config/db.js";

const T_ORDER = "DonHang";
const T_EVENT = "WebhookSepayEvent";

export const PaymentModel = {
  async getAppointmentInfo(maLichHen, conn = pool) {
    const [rows] = await conn.query(
      `SELECT l.*, b.soCCCD
         FROM LichHen l
         LEFT JOIN BenhNhan b ON b.maBenhNhan = l.maBenhNhan
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

  // 🔁 lấy theo **mã đơn hàng**
  async findById(maDonHang) {
    const [rows] = await pool.query(
      `SELECT d.*, d.trangThai AS dhTrangThai,
              l.*, l.trangThai AS lhTrangThai,
              b.soCCCD
         FROM ${T_ORDER} d
         JOIN LichHen   l ON l.maLichHen   = d.maLichHen
         LEFT JOIN BenhNhan b ON b.maBenhNhan = l.maBenhNhan
        WHERE d.maDonHang=? LIMIT 1`,
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
         JOIN LichHen   l ON l.maLichHen   = d.maLichHen
         LEFT JOIN BenhNhan b ON b.maBenhNhan = l.maBenhNhan
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
         JOIN LichHen   l ON l.maLichHen   = d.maLichHen
         LEFT JOIN BenhNhan b ON b.maBenhNhan = l.maBenhNhan
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
};
