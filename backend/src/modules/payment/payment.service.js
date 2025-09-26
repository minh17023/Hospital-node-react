import crypto from "crypto";
import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { env } from "../../config/env.js";
import { PaymentModel } from "./payment.model.js";

function genReference() {
  return "FT" + Date.now().toString(36).toUpperCase()
       + crypto.randomBytes(3).toString("hex").toUpperCase();
}

/** QR Sepay: https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=... */
function buildSepayQR({ amount, addInfo }) {
  const base = env.pay.sepayQrBase || "https://qr.sepay.vn/img";
  const acc  = env.pay.sepayQrAccount;
  const bank = env.pay.sepayQrBank;
  const template = env.pay.sepayQrTemplate || "qronly";
  const download = env.pay.sepayQrDownload;

  if (!acc || !bank) throw new AppError(500, "Thiếu cấu hình Sepay account/bank");

  const qs = new URLSearchParams();
  qs.set("acc", acc);
  qs.set("bank", bank);
  if (amount) qs.set("amount", String(amount));
  if (addInfo) qs.set("des", addInfo);
  if (template) qs.set("template", template);
  if (download !== "") qs.set("download", String(download));

  return `${base}?${qs.toString()}`;
}

/** Xác thực webhook: chỉ dùng query ?key=... */
function checkWebhookAuth(req) {
  const token = (req.query?.key || "").toString();
  return token && token === env.pay.sepayWebhookToken;
}

/** Khi Sepay không set referenceCode, rút mã FT... từ content/description */
function extractRef(body) {
  const rc = (body?.referenceCode || "").trim();
  if (rc) return rc;
  const txt = String(body?.content || body?.description || "");
  const m = txt.match(/\bFT[A-Z0-9]{6,}\b/);
  return m ? m[0] : "";
}

/** Chuẩn hóa object trả FE */
const toView = (row) => ({
  id: row.idDonHang,
  status: Number(row.dhTrangThai) === 1 ? "PAID" : "PENDING",
  amount: Number(row.soTien || 0),
  qrUrl: row.qrUrl || "",
  transferContent: row.referenceCode
    ? `${row.referenceCode} LH${row.idLichHen} ${row.soCCCD ? `CCCD:${row.soCCCD}` : ""}`.trim()
    : (row.ghiChu || ""),
  paidAt: row.paidAt || null,
  expireAt: row.expireAt || null,
});

export const PaymentService = {
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
      const addInfo = `${referenceCode} LH${idLichHen} CCCD:${appt.soCCCD || "N/A"}`;
      const qrUrl = buildSepayQR({ amount: soTien, addInfo });

      await PaymentModel.upsertByAppointment({
        idLichHen, referenceCode, soTien, qrUrl, ghiChu: `create:${addInfo}`
      }, conn);

      const full = await PaymentModel.findLatestByAppointment(idLichHen, conn);
      if (!full) throw new AppError(500, "Không đọc được đơn sau khi tạo");

      await conn.commit();
      return toView(full);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async getById(id) {
    const row = await PaymentModel.findById(Number(id));
    return row ? toView(row) : null;
  },

  async listByAppointment(idLichHen) {
    const rows = await PaymentModel.listByAppointment(Number(idLichHen));
    return rows.map(toView);
  },

  /** Webhook: ghi event + cập nhật đơn */
  async handleSepayWebhook(req) {
    const authorized = checkWebhookAuth(req);
    // luôn log event (kể cả 401)
    await PaymentModel.logWebhook({ httpStatus: authorized ? 200 : 401, body: req.body });

    if (!authorized) throw new AppError(401, "Unauthorized");

    if (String(req.body?.transferType || "").toLowerCase() !== "in") {
      return { success: true };
    }

    const referenceCode = extractRef(req.body);
    const amount = Number(req.body?.transferAmount || 0);
    if (!referenceCode || !amount) return { success: true };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const order = await PaymentModel.findByReference(referenceCode, conn);
      if (!order) { await conn.commit(); return { success: true, not_found: true }; }

      if (Number(order.trangThai) === 1) { await conn.commit(); return { success: true, duplicated: true }; }

      if (Math.abs(Number(order.soTien) - amount) !== 0) {
        await conn.commit(); 
        return { success: true, mismatch: true };
      }

      await PaymentModel.markPaid(order.idDonHang, conn);
      await PaymentModel.updateAppointmentStatusPaid(order.idLichHen, conn);

      await conn.commit();
      return { success: true, updated: true };
    } catch (e) {
      await conn.rollback();
      return { success: true, error: "internal" };
    } finally {
      conn.release();
    }
  },
};
