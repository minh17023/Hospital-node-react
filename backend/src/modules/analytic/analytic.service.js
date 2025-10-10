import { AnalyticModel } from "./analytic.model.js";
import { AppError } from "../../core/http/error.js";

/** helper: ghép '00:00:00' / '23:59:59' */
const toRangeTS = (from, to) => {
  if (!from || !to) throw new AppError(400, "Thiếu khoảng thời gian");
  const fromTS = `${from} 00:00:00`;
  const toTS   = `${to} 23:59:59`;
  return { fromTS, toTS };
};

const firstDayOfMonth = (y, m) => `${y}-${String(m).padStart(2,"0")}-01`;
const lastDayOfMonth  = (y, m) => {
  const d = new Date(Number(y), Number(m), 0); // day 0 of next month
  return d.toISOString().slice(0,10);
};

export const AnalyticService = {
  /**
   * Chuẩn hóa tham số lọc: 
   * - Ưu tiên from,to
   * - Hoặc year,month
   * - Hoặc chỉ year
   */
  normalizeRange({ from, to, year, month }) {
    if (from && to) {
      return { from, to };
    }

    if (year && month) {
      const f = firstDayOfMonth(year, month);
      const t = lastDayOfMonth(year, month);
      return { from: f, to: t };
    }

    if (year) {
      const f = `${year}-01-01`;
      const t = `${year}-12-31`;
      return { from: f, to: t };
    }

    throw new AppError(400, "Thiếu tham số thời gian: truyền (from,to) hoặc (year,month) hoặc (year)");
  },

  async summary(params) {
    const { from, to } = this.normalizeRange(params);
    const { fromTS, toTS } = toRangeTS(from, to);
    const data = await AnalyticModel.summaryRange({ fromTS, toTS });

    // thêm các giá trị phụ trợ
    const avgPaid = Number(data.ordersPaid || 0) ? Math.round(Number(data.revenuePaid) / Number(data.ordersPaid)) : 0;

    return {
      range: { from, to },
      revenuePaid: Number(data.revenuePaid || 0),
      revenueUnpaid: Number(data.revenueUnpaid || 0),
      orders: {
        total: Number(data.ordersTotal || 0),
        paid: Number(data.ordersPaid || 0),
        unpaid: Number(data.ordersUnpaid || 0),
        avgPaidOrderValue: avgPaid,
      },
    };
  },
};
