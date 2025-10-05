import { AppError } from "../../core/http/error.js";
import { WorkshiftModel } from "./workshift.model.js";

const isHHMM = (s) => /^\d{2}:\d{2}$/.test(String(s || ""));
const toMinutes = (s) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export const WorkshiftService = {
  async list(qs) {
    const limit = qs.limit ? Number(qs.limit) : 50;
    const offset = qs.offset ? Number(qs.offset) : 0;
    const filters = {
      q: qs.q || "",
      status: qs.status || "ALL",
      limit, offset
    };
    const [items, total] = await Promise.all([
      WorkshiftModel.list(filters),
      WorkshiftModel.count(filters)
    ]);
    return { items, total, limit, offset };
  },

  async get(ma) {
    const row = await WorkshiftModel.get(ma);
    if (!row) throw new AppError(404, "Không tìm thấy ca làm việc");
    return row;
  },

  async create(body) {
    const { tenCaLamViec, gioVao, gioRa, trangThai = 1, moTa = null } = body || {};
    if (!tenCaLamViec) throw new AppError(400, "Thiếu tên ca");
    if (!isHHMM(gioVao)) throw new AppError(400, "gioVao dạng HH:mm");
    if (!isHHMM(gioRa)) throw new AppError(400, "gioRa dạng HH:mm");

    if (toMinutes(gioVao) >= toMinutes(gioRa)) {
      throw new AppError(400, "gioVao phải nhỏ hơn gioRa");
    }

    const ma = await WorkshiftModel.create({ tenCaLamViec, gioVao, gioRa, trangThai, moTa });
    return await WorkshiftModel.get(ma);
  },

  async update(ma, body) {
    if (body.gioVao && !isHHMM(body.gioVao)) throw new AppError(400, "gioVao dạng HH:mm");
    if (body.gioRa  && !isHHMM(body.gioRa))  throw new AppError(400, "gioRa dạng HH:mm");

    if (body.gioVao && body.gioRa) {
      if (toMinutes(body.gioVao) >= toMinutes(body.gioRa)) {
        throw new AppError(400, "gioVao phải nhỏ hơn gioRa");
      }
    }

    const changed = await WorkshiftModel.update(ma, body);
    if (!changed) throw new AppError(404, "Không có thay đổi hoặc ca không tồn tại");
    return await WorkshiftModel.get(ma);
  },

  async remove(ma) {
    // không cho xóa nếu đang được tham chiếu bởi LichLamViec
    const ref = await WorkshiftModel.isReferenced(ma);
    if (ref) throw new AppError(409, "Ca đang được dùng trong lịch làm việc, không thể xóa");

    const n = await WorkshiftModel.remove(ma);
    if (!n) throw new AppError(404, "Không tìm thấy ca để xóa");
    return { deleted: true };
  }
};
