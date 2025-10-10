import { AppError } from "../../core/http/error.js";
import {
  findWorkingDaysByDoctorMonth,
  findShiftsByDoctorDate,
  listWorkshifts,
  insertWorkshift,
  generateWorkshifts,
  updateWorkshift,
  deleteWorkshift
} from "./schedule.model.js";

/* helpers */
const isAdmin  = (ctx) => ctx?.role === "ADMIN" || ctx?.role === 1;
const isDoctor = (ctx) => ctx?.role === "DOCTOR" || ctx?.role === 2;
const todayISO = () => new Date().toISOString().slice(0, 10);

function monthBounds(monthStr) {
  const [y, m] = (monthStr || "").split("-").map(Number);
  if (!y || !m) throw new AppError(400, "month phải dạng YYYY-MM");
  const first = new Date(y, m - 1, 1);
  const last  = new Date(y, m, 0);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { firstDay: iso(first), lastDay: iso(last) };
}

/* ===== FE ===== */
export async function getWorkingDays(maBacSi, monthStr) {
  const { firstDay, lastDay } = monthBounds(monthStr);
  return findWorkingDaysByDoctorMonth(String(maBacSi), firstDay, lastDay);
}

export async function getShiftsOfDate(maBacSi, ngayLamViec) {
  if (!ngayLamViec) throw new AppError(400, "Thiếu ngayLamViec (YYYY-MM-DD)");
  return findShiftsByDoctorDate(String(maBacSi), ngayLamViec);
}

/* ===== Admin & Doctor ===== */
export async function adminList(query, ctx) {
  // Admin: xem tổng thể (hoặc lọc theo maBacSi nếu truyền)
  // Doctor: ép maBacSi = chính mình nếu không trùng khớp
  let maBacSi = query.maBacSi || query.doctorCode || null;
  if (isDoctor(ctx)) {
    if (!maBacSi || String(maBacSi) !== String(ctx.maBacSi)) {
      maBacSi = ctx.maBacSi;
    }
  }

  // chuẩn hóa status
  let status = query.trangThaiLamViec ?? query.status;
    if (status === "" || status === "ALL" || status === undefined || status === null) {
      status = undefined;
  }

  return listWorkshifts({
    maBacSi,
    maPhongKham: query.maPhongKham || query.clinicCode,
    from: query.from, to: query.to,
    trangThaiLamViec: status,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });
}

/** /schedules/my — chỉ Doctor dùng */
export async function listMy(query, ctx) {
  if (!isDoctor(ctx)) throw new AppError(403, "Chỉ dành cho bác sĩ");
  return listWorkshifts({
    maBacSi: ctx.maBacSi,
    from: query.from, to: query.to,
    trangThaiLamViec: query.trangThaiLamViec ?? query.status,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });
}

export async function adminCreate(body, ctx) {
  for (const k of ["maBacSi", "maPhongKham", "maCaLamViec", "ngayLamViec"]) {
    if (!body[k]) throw new AppError(422, `Thiếu ${k}`);
  }

  if (isDoctor(ctx)) {
    if (String(body.maBacSi) !== String(ctx.maBacSi))
      throw new AppError(403, "Chỉ được tạo ca cho chính mình");
    if (new Date(body.ngayLamViec) < new Date(todayISO()))
      throw new AppError(400, "Không được tạo ca trong quá khứ");
  }

  if (body.soLuongBenhNhanToiDa == null) body.soLuongBenhNhanToiDa = 20;
  if (body.trangThaiLamViec == null) body.trangThaiLamViec = 1;

  body.nguoiTao = `${(ctx.kind || "").toUpperCase() || "USER"}:${ctx.maUser ?? ""}`;
  return insertWorkshift(body);
}

export async function adminGenerate(body, ctx) {
  if (!isAdmin(ctx)) throw new AppError(403, "Chỉ Admin được generate nhiều ca");

  for (const k of ["maBacSi", "maPhongKham", "from", "to"]) {
    if (!body[k]) throw new AppError(422, `Thiếu ${k}`);
  }
  const list = body.maCaLamViecList || body.shiftCodes;
  if (!Array.isArray(list) || !list.length) throw new AppError(422, "Thiếu maCaLamViecList");

  return generateWorkshifts({
    maBacSi: body.maBacSi,
    maPhongKham: body.maPhongKham,
    from: body.from, to: body.to,
    maCaLamViecList: list,
    soLuongBenhNhanToiDa: body.soLuongBenhNhanToiDa ?? 20,
    trangThaiLamViec: body.trangThaiLamViec ?? 1,
    nguoiTao: `${(ctx.kind || "").toUpperCase() || "USER"}:${ctx.maUser ?? ""}`
  });
}

export async function adminUpdate(maLichLamViec, body, ctx) {
  // Nếu Doctor: chỉ sửa ca của mình và ràng buộc an toàn
  if (isDoctor(ctx)) {
    const own = await listWorkshifts({ maBacSi: ctx.maBacSi, limit: 1, offset: 0 }); // chỉ cần kiểm tra quyền
    const allMine = await listWorkshifts({ maBacSi: ctx.maBacSi, limit: 500, offset: 0 });
    const cur = (allMine.items || []).find(x => String(x.maLichLamViec) === String(maLichLamViec));
    if (!cur) throw new AppError(404, "Không tìm thấy ca của bạn");

    if (body.maBacSi && String(body.maBacSi) !== String(ctx.maBacSi))
      throw new AppError(403, "Không được đổi sang bác sĩ khác");

    if (body.ngayLamViec && new Date(body.ngayLamViec) < new Date(todayISO()))
      throw new AppError(400, "Không được sửa ca quá khứ");

    if (body.soLuongBenhNhanToiDa != null &&
        Number(body.soLuongBenhNhanToiDa) < Number(cur.soLuongDaDangKy))
      throw new AppError(400, "soLuongBenhNhanToiDa không được nhỏ hơn soLuongDaDangKy hiện tại");
  }

  const rs = await updateWorkshift(String(maLichLamViec), body);
  if (!rs.affected) throw new AppError(400, "Không có thay đổi");
  return rs;
}

export async function adminRemove(maLichLamViec, ctx) {
  if (isDoctor(ctx)) {
    const mine = await listWorkshifts({ maBacSi: ctx.maBacSi, limit: 500, offset: 0 });
    const cur = (mine.items || []).find(x => String(x.maLichLamViec) === String(maLichLamViec));
    if (!cur) throw new AppError(404, "Không tìm thấy ca của bạn");
  }
  return deleteWorkshift(String(maLichLamViec)); // sẽ 409 nếu đã có đặt
}
