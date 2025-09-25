import { AppError } from "../../core/http/error.js";
import {
  findWorkingDaysByDoctorMonth,
  findShiftsByDoctorDate,
  listWorkshifts,
  insertWorkshift,
  generateWorkshifts,
  updateWorkshift,
  deleteWorkshift
} from "./workshift.model.js";

/* helpers */
const isAdmin  = (ctx) => ctx?.role === "ADMIN";
const isDoctor = (ctx) => ctx?.role === "DOCTOR";
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
export async function getWorkingDays(doctorId, monthStr) {
  const { firstDay, lastDay } = monthBounds(monthStr);
  return findWorkingDaysByDoctorMonth(Number(doctorId), firstDay, lastDay);
}

export async function getShiftsOfDate(doctorId, ngayLamViec) {
  if (!ngayLamViec) throw new AppError(400, "Thiếu ngayLamViec (YYYY-MM-DD)");
  return findShiftsByDoctorDate(Number(doctorId), ngayLamViec);
}

/* ===== Admin & Doctor ===== */
export async function adminList(query, ctx) {
  // Doctor chỉ xem ca của mình
  if (isDoctor(ctx)) query.idBacSi = ctx.idBacSi;

  return listWorkshifts({
    idBacSi: query.idBacSi || query.doctorId,
    idPhongKham: query.idPhongKham || query.clinicId,
    from: query.from, to: query.to,
    trangThaiLamViec: query.trangThaiLamViec ?? query.status
  });
}

export async function adminCreate(body, ctx) {
  for (const k of ["idBacSi", "idPhongKham", "idCaLamViec", "ngayLamViec"]) {
    if (!body[k]) throw new AppError(422, `Thiếu ${k}`);
  }

  if (isDoctor(ctx)) {
    if (Number(body.idBacSi) !== Number(ctx.idBacSi))
      throw new AppError(403, "Chỉ được tạo ca cho chính mình");
    if (new Date(body.ngayLamViec) < new Date(todayISO()))
      throw new AppError(400, "Không được tạo ca trong quá khứ");
  }

  if (body.soLuongBenhNhanToiDa == null) body.soLuongBenhNhanToiDa = 20;
  if (body.trangThaiLamViec == null) body.trangThaiLamViec = 1;

  body.nguoiTao = `${ctx.role || "UNKNOWN"}:${ctx.idUser ?? ""}`;
  return insertWorkshift(body);
}

export async function adminGenerate(body, ctx) {
  if (!isAdmin(ctx)) throw new AppError(403, "Chỉ Admin được generate nhiều ca");

  for (const k of ["idBacSi", "idPhongKham", "from", "to"]) {
    if (!body[k]) throw new AppError(422, `Thiếu ${k}`);
  }
  const list = body.idCaLamViecList || body.shiftIds;
  if (!Array.isArray(list) || !list.length) throw new AppError(422, "Thiếu idCaLamViecList");

  return generateWorkshifts({
    idBacSi: body.idBacSi,
    idPhongKham: body.idPhongKham,
    from: body.from, to: body.to,
    idCaLamViecList: list,
    soLuongBenhNhanToiDa: body.soLuongBenhNhanToiDa ?? 20,
    trangThaiLamViec: body.trangThaiLamViec ?? 1,
    nguoiTao: `${ctx.role || "UNKNOWN"}:${ctx.idUser ?? ""}`
  });
}

export async function adminUpdate(idLichLamViec, body, ctx) {
  // Nếu Doctor: chỉ sửa ca của mình và ràng buộc an toàn
  if (isDoctor(ctx)) {
    const own = await listWorkshifts({ idBacSi: ctx.idBacSi });
    const cur = own.find(x => Number(x.idLichLamViec) === Number(idLichLamViec));
    if (!cur) throw new AppError(404, "Không tìm thấy ca của bạn");

    if (body.idBacSi && Number(body.idBacSi) !== Number(ctx.idBacSi))
      throw new AppError(403, "Không được đổi sang bác sĩ khác");

    if (body.ngayLamViec && new Date(body.ngayLamViec) < new Date(todayISO()))
      throw new AppError(400, "Không được sửa ca quá khứ");

    if (body.soLuongBenhNhanToiDa != null &&
        Number(body.soLuongBenhNhanToiDa) < Number(cur.soLuongDaDangKy))
      throw new AppError(400, "soLuongBenhNhanToiDa không được nhỏ hơn soLuongDaDangKy hiện tại");
  }

  const rs = await updateWorkshift(Number(idLichLamViec), body);
  if (!rs.affected) throw new AppError(400, "Không có thay đổi");
  return rs;
}

export async function adminRemove(idLichLamViec, ctx) {
  if (isDoctor(ctx)) {
    const own = await listWorkshifts({ idBacSi: ctx.idBacSi });
    const cur = own.find(x => Number(x.idLichLamViec) === Number(idLichLamViec));
    if (!cur) throw new AppError(404, "Không tìm thấy ca của bạn");
  }
  return deleteWorkshift(Number(idLichLamViec)); // sẽ 409 nếu đã có đặt
}
