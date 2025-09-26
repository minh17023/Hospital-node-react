import crypto from "crypto";
import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { PaymentModel } from "./payment.model.js";

/** Gen mã đối soát (khớp với webhook.referenceCode) */
function genReference() {
  return "FT" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString("hex").toUpperCase();
}

/** Tạo link ảnh QR Sepay — chỉnh path theo cấu hình Sepay của bạn */
function buildSepayQR({ amount, addInfo }) {
  const base  = process.env.SEPAY_QR_BASE;
  const bank  = process.env.SEPAY_QR_BANK;
  const acc   = process.env.SEPAY_QR_ACCOUNT;
  const name  = encodeURIComponent(process.env.SEPAY_QR_ACCOUNT_NAME || "");
  const style = process.env.SEPAY_QR_STYLE || "compact";

  const qs = new URLSearchParams();
  if (amount) qs.set("amount", String(amount));
  if (addInfo) qs.set("addInfo", addInfo);
  if (name) qs.set("accountName", name);
  if (style) qs.set("style", style);

  // ví dụ: {base}/{BANK}-{ACCOUNT}-qr_only.png?... (đổi cho đúng nhà cung cấp của bạn)
  return `${base}/${bank}-${acc}-qr_only.png?${qs.toString()}`;
}

function checkWebhookAuth(req) {
  const key =
    req.query.key ||
    req.headers["x-webhook-key"] ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return key && (key === process.env.SEPAY_WEBHOOK_TOKEN || key === process.env.SEPAY_WEBHOOK_KEY);
}

export const PaymentService = {
  /** Tạo đơn thanh toán từ idLichHen */
  async create({ idLichHen }) {
    if (!idLichHen) throw new AppError(400, "Thiếu idLichHen");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const appt = await PaymentModel.getAppointmentInfo(idLichHen, conn);
      if (!appt) throw new AppError(404, "Lịch hẹn không tồn tại");

      const soTien = Number(appt.phiDaGiam || 0);
      if (!soTien) throw new AppError(400, "phiDaGiam không hợp lệ");

      const referenceCode = genReference();
      // Ghi chú/addInfo chứa cả CCCD để tra soát
      const addInfo = `${referenceCode} LH${idLichHen} CCCD:${appt.soCCCD || "N/A"}`;
      const qrUrl = buildSepayQR({ amount: soTien, addInfo });

      await PaymentModel.upsertByAppointment({
        idLichHen, referenceCode, soTien, qrUrl,
        ghiChu: `create:${addInfo}`
      }, conn);

      const order = await PaymentModel.findByReference(referenceCode, conn);
      const full  = await PaymentModel.findById(order?.idDonHang, conn);

      await conn.commit();
      return full;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  getById(id) {
    return PaymentModel.findById(Number(id));
  },

  listByAppointment(idLichHen) {
    return PaymentModel.listByAppointment(Number(idLichHen));
  },

  /** Xử lý webhook Sepay */
  async handleSepayWebhook(req) {
    const authorized = checkWebhookAuth(req);
    await PaymentModel.logWebhook({ httpStatus: authorized ? 200 : 401, body: req.body });

    if (!authorized) throw new AppError(401, "Unauthorized");

    const type = String(req.body?.transferType || "").toLowerCase();
    if (type !== "in") return { success: true };

    const referenceCode = (req.body?.referenceCode || "").trim();
    const amount = Number(req.body?.transferAmount || 0);
    if (!referenceCode || !amount) return { success: true };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const order = await PaymentModel.findByReference(referenceCode, conn);
      if (!order) { await conn.commit(); return { success: true }; }

      if (order.trangThai === 1) { await conn.commit(); return { success: true, duplicated: true }; }

      // khớp số tiền tuyệt đối
      if (Math.abs(order.soTien - amount) !== 0) {
        await conn.commit();
        return { success: true, mismatch: true };
      }

      await PaymentModel.markPaid(order.idDonHang, conn);
      await PaymentModel.updateAppointmentStatusPaid(order.idLichHen, conn);

      await conn.commit();
      return { success: true };
    } catch (e) {
      await conn.rollback();
      return { success: true, error: "internal" };
    } finally {
      conn.release();
    }
  },
};
