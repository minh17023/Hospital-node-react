import { AnalyticModel, DoctorStatsModel } from "./analytic.model.js";
import { AppError } from "../../core/http/error.js";

/** helper: ghép '00:00:00' / '23:59:59' cho analytic admin */
const toRangeTS = (from, to) => {
  if (!from || !to) throw new AppError(400, "Thiếu khoảng thời gian");
  const fromTS = `${from} 00:00:00`;
  const toTS   = `${to} 23:59:59`;
  return { fromTS, toTS };
};

const firstDayOfMonth = (y, m) => `${y}-${String(m).padStart(2,"0")}-01`;
const lastDayOfMonth  = (y, m) => {
  const d = new Date(Number(y), Number(m), 0);
  return d.toISOString().slice(0,10);
};

/* ================= Admin analytics ================= */
export const AnalyticService = {
  normalizeRange({ from, to, year, month }) {
    if (from && to) return { from, to };
    if (year && month) return { from: firstDayOfMonth(year, month), to: lastDayOfMonth(year, month) };
    if (year) return { from: `${year}-01-01`, to: `${year}-12-31` };
    throw new AppError(400, "Thiếu tham số thời gian: (from,to) hoặc (year,month) hoặc (year)");
  },

  async summary(params) {
    const { from, to } = this.normalizeRange(params);
    const { fromTS, toTS } = toRangeTS(from, to);
    const data = await AnalyticModel.summaryRange({ fromTS, toTS });

    const avgPaid = Number(data.ordersPaid || 0)
      ? Math.round(Number(data.revenuePaid) / Number(data.ordersPaid))
      : 0;

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

/* ================= Doctor stats (API duy nhất cho BS) ================= */
const today = () => new Date().toISOString().slice(0, 10);
function normalizeRange({ from, to }) {
  const f = from || today();
  const t = to   || today();
  if (new Date(f) > new Date(t)) throw new AppError(400, "Khoảng ngày không hợp lệ");
  return { from: f, to: t };
}

export const DoctorStatsService = {
  async stats(query = {}, ctx = {}) {
    const { from, to } = normalizeRange(query);
    const maBacSi = query?.maBacSi || ctx?.maBacSi;
    if (!maBacSi) throw new AppError(400, "Thiếu mã bác sĩ (maBacSi)");

    const { counts, items, total } = await DoctorStatsModel.statsByDoctor({
      maBacSi,
      from,
      to,
      limit: query?.limit ? Number(query.limit) : 10,
    });

    return {
      range: { from, to },
      maBacSi: String(maBacSi),
      inProgress: Number(counts.inProgress || 0),
      registered: Number(counts.registered || 0),
      done: Number(counts.done || 0),
      noShow: Number(counts.noShow || 0),
      cancelled: Number(counts.cancelled || 0),
      // items nhẹ – FE hiện chưa dùng (nếu cần có thể bổ sung)
      items: items.map(r => ({
        maLichHen: r.maLichHen,
        trangThai: Number(r.trangThai),
        ngayHen: r.ngayHen,
        gioHen: r.gioHen,
        hoTen: r.hoTen,
        soDienThoai: r.soDienThoai || "",
      })),
      total,
    };
  },
};
