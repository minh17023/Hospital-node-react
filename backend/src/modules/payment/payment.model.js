import { pool } from "../../config/db.js";

const T_ORDER = "DonHang";
const T_EVENT = "WebhookSepayEvent";

export const PaymentModel = {
  async getAppointmentInfo(idLichHen, conn = pool) {
    const [rows] = await conn.query(
      `SELECT l.*, b.soCCCD
         FROM LichHen l
         LEFT JOIN BenhNhan b ON b.idBenhNhan = l.idBenhNhan
        WHERE l.idLichHen=? LIMIT 1`, [idLichHen]
    );
    return rows[0] || null;
  },

  async upsertByAppointment({ idLichHen, referenceCode, soTien, qrUrl, ghiChu }, conn = pool) {
    const [rs] = await conn.query(
      `INSERT INTO ${T_ORDER}
         (idLichHen, referenceCode, soTien, qrUrl, gateway, trangThai, ghiChu)
       VALUES (?, ?, ?, ?, 'SEPAY', 0, ?)
       ON DUPLICATE KEY UPDATE
         referenceCode=VALUES(referenceCode),
         soTien=VALUES(soTien),
         qrUrl=VALUES(qrUrl),
         trangThai=0,
         ghiChu=VALUES(ghiChu),
         createdAt=CURRENT_TIMESTAMP`,
      [idLichHen, referenceCode, soTien, qrUrl, ghiChu]
    );
    return rs.insertId || null;
  },

  async findById(idDonHang) {
    const [rows] = await pool.query(
      `SELECT d.*, l.*, b.soCCCD
         FROM ${T_ORDER} d
         JOIN LichHen l ON l.idLichHen = d.idLichHen
         LEFT JOIN BenhNhan b ON b.idBenhNhan = l.idBenhNhan
        WHERE d.idDonHang=? LIMIT 1`, [idDonHang]
    );
    return rows[0] || null;
  },

  async listByAppointment(idLichHen) {
    const [rows] = await pool.query(
      `SELECT d.*, l.*, b.soCCCD
         FROM ${T_ORDER} d
         JOIN LichHen l ON l.idLichHen = d.idLichHen
         LEFT JOIN BenhNhan b ON b.idBenhNhan = l.idBenhNhan
        WHERE d.idLichHen=?
        ORDER BY d.createdAt DESC, d.idDonHang DESC`, [idLichHen]
    );
    return rows;
  },

  async findByReference(referenceCode, conn = pool) {
    const [rows] = await conn.query(
      `SELECT idDonHang, idLichHen, soTien, trangThai
         FROM ${T_ORDER} WHERE referenceCode=? LIMIT 1`, [referenceCode]
    );
    return rows[0] || null;
  },

  async findLatestByAppointment(idLichHen, conn = pool) {
    const [rows] = await conn.query(
      `SELECT d.*, l.*, b.soCCCD
         FROM ${T_ORDER} d
         JOIN LichHen l ON l.idLichHen = d.idLichHen
         LEFT JOIN BenhNhan b ON b.idBenhNhan = l.idBenhNhan
        WHERE d.idLichHen=?
        ORDER BY d.createdAt DESC, d.idDonHang DESC
        LIMIT 1`, [idLichHen]
    );
    return rows[0] || null;
  },

  async markPaid(idDonHang, conn = pool) {
    const [rs] = await conn.query(
      `UPDATE ${T_ORDER}
          SET trangThai=1, paidAt=NOW(), ghiChu=CONCAT(COALESCE(ghiChu,''),' | paid:webhook')
        WHERE idDonHang=?`, [idDonHang]
    );
    return rs.affectedRows || 0;
  },

  async updateAppointmentStatusPaid(idLichHen, conn = pool) {
    await conn.query(
      `UPDATE LichHen SET trangThai=2
        WHERE idLichHen=? AND (trangThai IS NULL OR trangThai IN (0,1))`, [idLichHen]
    );
  },

  async logWebhook({ httpStatus, body }, conn = pool) {
    const b = body || {};
    try {
      await conn.query(
        `INSERT INTO ${T_EVENT}
         (httpStatus, rawJson, gateway, transactionDate, accountNumber, subAccount, transferType,
          description, transferAmount, referenceCode, accumulated, content)
         VALUES (?, CAST(? AS JSON), 'SEPAY', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          httpStatus, JSON.stringify(b),
          b.transactionDate || null,
          b.accountNumber || null,
          b.subAccount || null,
          b.transferType || null,
          b.description || null,
          b.transferAmount || null,
          b.referenceCode || null,
          b.accumulated || null,
          b.content || null
        ]
      );
    } catch {}
  },
};
