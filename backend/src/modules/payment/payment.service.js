import crypto from "crypto";
import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { env } from "../../config/env.js";
import { PaymentModel } from "./payment.model.js";

/* ===== Helpers ===== */
const FT_RE = /\bFT[A-Z0-9]{6,}\b/g;

function genReference() {
  return "FT" + Date.now().toString(36).toUpperCase()
       + crypto.randomBytes(3).toString("hex").toUpperCase();
}

function refsFromContent(body) {
  const s = String(body?.content || body?.description || "");
  const list = s.match(FT_RE) || [];
  return [...new Set(list.map(x => x.toUpperCase()))];
}

function checkWebhookAuth(req) {
  const token = String(req.query?.key || "");
  return token && token === env.pay.sepayWebhookToken;
}

/** QR sepay: https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=... */
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

/* ===== Service ===== */
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

      // 1) Mã của bạn
      const referenceCode = genReference();
      const addInfo = `${referenceCode} LH${idLichHen} CCCD:${appt.soCCCD || "N/A"}`;

      // 2) Link QR Sepay
      const qrUrl = buildSepayQR({ amount: soTien, addInfo });

      // 3) Lưu đơn; append ghi chú
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

  /** Webhook Sepay */
  async handleSepayWebhook(req) {
    const authorized = checkWebhookAuth(req);

    // Bóc mã của bạn từ content trước
    const listFromContent = refsFromContent(req.body);
    const overrideRef = listFromContent[0] || null;

    // luôn log event; ghi referenceCode = mã đã bóc nếu có
    await PaymentModel.logWebhook({
      httpStatus: authorized ? 200 : 401,
      body: req.body,
      overrideRef,
    });

    if (!authorized) throw new AppError(401, "Unauthorized");

    if (String(req.body?.transferType || "").toLowerCase() !== "in") {
      return { success: true };
    }

    const amount = Number(req.body?.transferAmount || 0);
    if (!amount) return { success: true };

    // danh sách mã ứng viên: mã của bạn trong content (ưu tiên), rồi tới referenceCode của bank
    const candidates = [...listFromContent];
    const bankRef = (req.body?.referenceCode || "").trim();
    if (bankRef) candidates.push(bankRef.toUpperCase());

    if (candidates.length === 0) return { success: true, not_found: true };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let order = null;
      for (const ref of candidates) {
        order = await PaymentModel.findByReference(ref, conn);
        if (order) break;
      }

      if (!order) { await conn.commit(); return { success: true, not_found: true }; }

      if (Number(order.trangThai) === 1) { await conn.commit(); return { success: true, duplicated: true }; }

      if (Math.abs(Number(order.soTien) - amount) !== 0) {
        await conn.commit();
        return { success: true, mismatch: true };
      }

      await PaymentModel.markPaid(order.idDonHang, conn);

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
