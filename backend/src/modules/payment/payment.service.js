import { PaymentModel } from "./payment.model.js";
import { AppointmentModel } from "../appointment/appointment.model.js";
import { AppError } from "../../core/http/error.js";
import { env } from "../../config/env.js";

function randomCode(n = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function buildVietQrUrl({ bank, account, name, amount, addInfo, style }) {
  const safeInfo = encodeURIComponent(addInfo || "");
  return (
    `${env.pay.qrBase}/${bank}-${account}-${encodeURIComponent(name)}.jpg` +
    `?amount=${amount}&addInfo=${safeInfo}&accountName=${encodeURIComponent(name)}` +
    (style ? `&style=${style}` : "")
  );
}

export const PaymentService = {
  /** Tạo/khôi phục đơn thanh toán cho 1 lịch hẹn */
  async createForAppointment(idLichHen) {
    const appt = await AppointmentModel.getById(idLichHen);
    if (!appt) throw new AppError(404, "Không tìm thấy lịch hẹn");

    // Lấy đúng số tiền từ lịch hẹn (ưu tiên phiDaGiam)
    const amount = Number(appt.phiDaGiam ?? appt.phidagiam ?? appt.phiKhamGoc ?? 0);
    if (!amount || amount <= 0) throw new AppError(400, "Không thể xác định số tiền thanh toán");

    // Nếu đã có PENDING đúng số tiền => tái dùng
    const existed = await PaymentModel.findPendingByAppointment(idLichHen);
    if (existed && Number(existed.amount) === amount) return existed;
    if (existed) await PaymentModel.cancel(existed.id);

    const code = `LH${idLichHen}-${randomCode(5)}`;
    const qrUrl = buildVietQrUrl({
      bank: env.pay.bank,
      account: env.pay.account,
      name: env.pay.accountName,
      amount,
      addInfo: code,
      style: env.pay.style, // dùng env.pay.style
    });

    // TTL (nếu có)
    const expireAt = env.pay.ttlMinutes
      ? new Date(Date.now() + env.pay.ttlMinutes * 60 * 1000)
      : null;

    const id = await PaymentModel.create({
      appointmentId: idLichHen,
      amount,
      transferContent: code,
      qrUrl,
      expireAt,
      meta: {
        phiKhamGoc: appt.phiKhamGoc ?? null,
        phiDaGiam: appt.phiDaGiam ?? null,
      },
    });

    return await PaymentModel.getById(id);
  },

  async getOrder(id) {
    const o = await PaymentModel.getById(id);
    if (!o) throw new AppError(404, "Không tìm thấy đơn");
    return o;
  },

  async listByAppointment(idLichHen) {
    return await PaymentModel.listByAppointment(idLichHen);
  },

  /** Áp webhook từ Sepay */
  async applyWebhook({ amount, transferContent, when, providerRef }) {
    // Tìm theo code "LH{id}-xxxxx" trong nội dung chuyển khoản
    const match = /LH(\d+)/i.exec(transferContent || "");
    if (!match) return { ok: false, reason: "no_code" };

    const order = await PaymentModel.findByTransferContentLike(match[0]);
    if (!order) return { ok: false, reason: "not_found" };

    // kiểm số tiền (cho phép lệch nhỏ)
    if (Math.abs(Number(amount) - Number(order.amount)) > 500) {
      return { ok: false, reason: "amount_mismatch" };
    }

    await PaymentModel.markPaid(order.id, providerRef || match[0]);

    // cập nhật lịch hẹn: 2 = đã thanh toán
    await AppointmentModel.updateStatus(order.appointmentId, 2);

    return { ok: true, orderId: order.id };
  },
};
