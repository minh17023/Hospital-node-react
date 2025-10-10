import crypto from "crypto";
import { pool } from "../../config/db.js";
import { AppError } from "../../core/http/error.js";
import { env } from "../../config/env.js";
import { PaymentModel } from "./payment.model.js";

const FT_RE = /\bFT[A-Z0-9]{6,}\b/g;
const genReference = () =>
  "FT" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString("hex").toUpperCase();
const refsFromContent = (body) => ([...(String(body?.content || body?.description || "").match(FT_RE) || [])]
  .map(x => x.toUpperCase()));
const checkWebhookAuth = (req) => String(req.query?.key || "") === env.pay.sepayWebhookToken;

function buildSepayQR({ amount, addInfo }) {
  const base = env.pay.sepayQrBase || "https://qr.sepay.vn/img";
  const acc  = env.pay.sepayQrAccount;
  const bank = env.pay.sepayQrBank;
  const template = env.pay.sepayQrTemplate || "qronly";
  const download = env.pay.sepayQrDownload;
  if (!acc || !bank) throw new AppError(500, "Thiếu cấu hình Sepay account/bank");
  const qs = new URLSearchParams();
  qs.set("acc", acc); qs.set("bank", bank);
  if (amount) qs.set("amount", String(amount));
  if (addInfo) qs.set("des", addInfo);
  if (template) qs.set("template", template);
  if (download !== "") qs.set("download", String(download));
  return `${base}?${qs.toString()}`;
}

const toView = (row) => ({
  id: row.maDonHang,             
  status: Number(row.dhTrangThai) === 1 ? "PAID" : "PENDING",
  amount: Number(row.soTien || 0),
  qrUrl: row.qrUrl || "",
  transferContent: row.referenceCode
    ? `${row.referenceCode} LH${row.maLichHen} ${row.soCCCD ? `CCCD:${row.soCCCD}` : ""}`.trim()
    : (row.ghiChu || ""),
  paidAt: row.paidAt || null,
  expireAt: row.expireAt || null,
});

const toSimpleView = (row) => ({
  maDonHang: row.maDonHang,
  maLichHen: row.maLichHen,
  soTien: Number(row.soTien),
  trangThai: Number(row.trangThai),
  qrUrl: row.qrUrl || "",
  ghiChu: row.ghiChu || "",
  createdAt: row.createdAt || null,
  paidAt: row.paidAt || null,
});

export const PaymentService = {
  async create({ maLichHen }) {
    if (!maLichHen) throw new AppError(400, "Thiếu maLichHen");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const appt = await PaymentModel.getAppointmentInfo(maLichHen, conn);
      if (!appt) throw new AppError(404, "Lịch hẹn không tồn tại");

      const soTien = Number(appt.phiDaGiam || 0);
      if (!soTien) throw new AppError(400, "phiDaGiam không hợp lệ");

      const referenceCode = genReference();
      const addInfo = `${referenceCode} LH${maLichHen} ${appt.soCCCD ? `CCCD:${appt.soCCCD}` : ""}`.trim();
      const qrUrl = buildSepayQR({ amount: soTien, addInfo });

      await PaymentModel.upsertByAppointment({
        maLichHen, referenceCode, soTien, qrUrl, ghiChu: `create:${addInfo}`
      }, conn);

      const full = await PaymentModel.findLatestByAppointment(maLichHen, conn);
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

  //  lấy theo **mã đơn hàng**
  async getSimpleByMa(maDonHang) {
    const row = await PaymentModel.findSimpleByMa(String(maDonHang));
    return row ? toSimpleView(row) : null;
  },

  async listByAppointment(maLichHen) {
    const rows = await PaymentModel.listByAppointment(String(maLichHen));
    return rows.map(toView);
  },

  async handleSepayWebhook(req) {
    const authorized = checkWebhookAuth(req);
    const listFromContent = refsFromContent(req.body);
    const overrideRef = listFromContent[0] || null;

    await PaymentModel.logWebhook({
      httpStatus: authorized ? 200 : 401,
      body: req.body,
      overrideRef,
    });

    if (!authorized) throw new AppError(401, "Unauthorized");
    if (String(req.body?.transferType || "").toLowerCase() !== "in") return { success: true };

    const amount = Number(req.body?.transferAmount || 0);
    if (!amount) return { success: true };

    const candidates = [...listFromContent];
    const bankRef = (req.body?.referenceCode || "").trim();
    if (bankRef) candidates.push(bankRef.toUpperCase());
    if (candidates.length === 0) return { success: true, not_found: true };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let order = null;
      for (const ref of candidates) {
        order = await PaymentModel.findByReference(ref, conn); // trả về maDonHang
        if (order) break;
      }
      if (!order) { await conn.commit(); return { success: true, not_found: true }; }
      if (Number(order.trangThai) === 1) { await conn.commit(); return { success: true, duplicated: true }; }
      if (Math.abs(Number(order.soTien) - amount) !== 0) {
        await conn.commit(); return { success: true, mismatch: true };
      }

      await PaymentModel.markPaid(order.maDonHang, conn); // 🔁 theo mã
      await conn.commit();
      return { success: true, updated: true };
    } catch {
      await conn.rollback();
      return { success: true, error: "internal" };
    } finally {
      conn.release();
    }
  },

  async getSimpleById(maDonHang) {
    const row = await PaymentModel.findSimpleById(String(maDonHang));
    return row ? toSimpleView(row) : null;
  },

  //  List all (simple)
  async listAllSimple({ q, status, limit, offset }) {
    const { items, total } = await PaymentModel.listAllSimple({
      q: q?.trim() || "",
      status,
      limit: Number(limit) || 20,
      offset: Number(offset) || 0,
    });
    return { items: items.map(toSimpleView), total };
  },
};
