import { pool } from "../../config/db.js";

export const PaymentModel = {
  async findPendingByAppointment(idLichHen) {
    const [rows] = await pool.query(
      `SELECT * FROM PaymentOrder
       WHERE appointmentId=? AND status='PENDING'
       ORDER BY id DESC LIMIT 1`,
      [idLichHen]
    );
    return rows[0] || null;
  },

  async listByAppointment(idLichHen) {
    const [rows] = await pool.query(
      `SELECT * FROM PaymentOrder
       WHERE appointmentId=?
       ORDER BY id DESC`,
      [idLichHen]
    );
    return rows;
  },

  async create(order) {
    const {
      appointmentId, amount, currency = "VND",
      transferContent, qrUrl, status = "PENDING",
      expireAt = null, meta = null
    } = order;

    const [rs] = await pool.query(
      `INSERT INTO PaymentOrder
       (appointmentId, amount, currency, transferContent, qrUrl, status, expireAt, meta, createdAt)
       VALUES (?,?,?,?,?,?,?,?, NOW())`,
      [appointmentId, amount, currency, transferContent, qrUrl, status, expireAt, JSON.stringify(meta)]
    );
    return rs.insertId;
  },

  async getById(id) {
    const [rows] = await pool.query(
      `SELECT po.*,
              lh.idBenhNhan, lh.idBacSi, lh.ngayHen, lh.gioHen, lh.trangThai AS trangThaiLichHen
         FROM PaymentOrder po
         LEFT JOIN LichHen lh ON lh.idLichHen = po.appointmentId
        WHERE po.id=? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async markPaid(id, ref) {
    await pool.query(
      `UPDATE PaymentOrder SET status='PAID', paidAt=NOW(), providerRef=? WHERE id=?`,
      [ref || null, id]
    );
  },

  async cancel(id) {
    await pool.query(`UPDATE PaymentOrder SET status='CANCELLED' WHERE id=?`, [id]);
  },

  async findByTransferContentLike(code) {
    const [rows] = await pool.query(
      `SELECT * FROM PaymentOrder
       WHERE transferContent LIKE ? AND status='PENDING'
       ORDER BY id DESC LIMIT 1`,
      [`%${code}%`]
    );
    return rows[0] || null;
  },
};
