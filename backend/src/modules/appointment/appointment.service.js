import { AppError } from "../../core/http/error.js";
import { AppointmentModel } from "./appointment.model.js";
import { pool } from "../../config/db.js";

const need = (v, name) => {
  if (v === undefined || v === null || v === "") throw new AppError(400, `Thiếu ${name}`);
};
const pad = (n) => String(n).padStart(2, "0");

// Thêm 2 field phí vào object lịch hẹn
async function attachFees(appt) {
  if (!appt) return null;
  const [base, hasBHYT] = await Promise.all([
    AppointmentModel.baseFeeByAppointment(appt.idLichHen),
    AppointmentModel.hasValidBHYTByPatient(appt.idBenhNhan),
  ]);
  const phiKhamGoc = base;
  const phiDaGiam  = hasBHYT ? Math.round(base * 0.5) : base;
  return { ...appt, phiKhamGoc, phiDaGiam };
}

export const AppointmentService = {
  /* ===== Online (Booking) ===== */
  async createOnline(idLichLamViec, body) {
    need(idLichLamViec, "idLichLamViec");
    const { idBenhNhan, idBacSi, idChuyenKhoa, loaiKham, lyDoKham } = body || {};
    need(idBenhNhan, "idBenhNhan");
    need(idBacSi, "idBacSi");
    need(idChuyenKhoa, "idChuyenKhoa");
    need(loaiKham, "loaiKham");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        `SELECT llv.*, clv.gioVao
           FROM LichLamViec llv
           JOIN CaLamViec clv ON clv.idCaLamViec = llv.idCaLamViec
          WHERE llv.idLichLamViec=? FOR UPDATE`,
        [idLichLamViec]
      );
      const ca = rows[0];
      if (!ca) throw new AppError(404, "Ca không tồn tại");
      if (Number(ca.idBacSi) !== Number(idBacSi))
        throw new AppError(400, "Bác sĩ không khớp với ca");

      const [[{ n: used }]] = await conn.query(
        `SELECT COUNT(*) n
           FROM LichHen
          WHERE idBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1`,
        [ca.idBacSi, ca.ngayLamViec, ca.gioVao]
      );
      if (used >= Number(ca.soLuongBenhNhanToiDa)) throw new AppError(409, "Ca đã đầy");

      const [dup] = await conn.query(
        `SELECT 1
           FROM LichHen
          WHERE idBenhNhan=? AND idBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1
          LIMIT 1`,
        [idBenhNhan, ca.idBacSi, ca.ngayLamViec, ca.gioVao]
      );
      if (dup.length) throw new AppError(409, "Bạn đã đặt lịch trong ca này");

      const stt = Number(used) + 1;
      const [rs] = await conn.query(
        `INSERT INTO LichHen
         (idBenhNhan,idBacSi,idChuyenKhoa,ngayHen,gioHen,loaiKham,lyDoKham,hinhThuc,trangThai,sttKham,ngayTao)
         VALUES (?,?,?,?,?,?,?,?,?,?, NOW())`,
        [idBenhNhan, idBacSi, idChuyenKhoa, ca.ngayLamViec, ca.gioVao,
         loaiKham, lyDoKham || null, 2, 1, stt]
      );

      await conn.query(
        "UPDATE LichLamViec SET soLuongDaDangKy = soLuongDaDangKy + 1 WHERE idLichLamViec=?",
        [idLichLamViec]
      );

      await conn.commit();
      const appt = await AppointmentModel.getById(rs.insertId);
      return await attachFees(appt);
    } catch (e) {
      await conn.rollback();
      if (e && e.code === "ER_DUP_ENTRY") throw new AppError(409, "Bạn đã đặt lịch trong ca này");
      throw e;
    } finally {
      conn.release();
    }
  },

  /* ===== Walk-in (tại quầy/kiosk) ===== */
  async createWalkin(body) {
    const { idBenhNhan, idBacSi, idChuyenKhoa, loaiKham, lyDoKham } = body || {};
    need(idBenhNhan, "idBenhNhan");
    need(idBacSi, "idBacSi");
    need(idChuyenKhoa, "idChuyenKhoa");
    need(loaiKham, "loaiKham");

    const now = new Date();
    const ngayISO = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const gioNow  = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const ca = await AppointmentModel.findOpenShiftForDoctor(idBacSi, ngayISO, gioNow);
    if (!ca) throw new AppError(409, "Hiện bác sĩ không có ca làm việc.");

    const used = await AppointmentModel.countInWindow(idBacSi, ngayISO, ca.gioVao, ca.gioRa);
    if (used >= Number(ca.soLuongBenhNhanToiDa)) throw new AppError(409, "Ca đã đầy");

    const [dupRows] = await pool.query(
      `SELECT 1 FROM LichHen
        WHERE idBenhNhan=? AND idBacSi=? AND ngayHen=?
          AND gioHen >= ? AND gioHen < ? AND trangThai<>-1
        LIMIT 1`,
      [idBenhNhan, idBacSi, ngayISO, ca.gioVao, ca.gioRa]
    );
    if (dupRows.length) throw new AppError(409, "Bạn đã có lịch trong ca này");

    const stt = Number(used) + 1;

    const id = await AppointmentModel.insert({
      idBenhNhan,
      idBacSi,
      idChuyenKhoa,
      ngayHen: ngayISO,
      gioHen: gioNow,
      loaiKham,
      lyDoKham: lyDoKham || "Đặt trực tiếp",
      hinhThuc: 1,
      trangThai: 1,
      sttKham: stt
    });

    const idLLV = await AppointmentModel.findShiftByDoctorDateTime(idBacSi, ngayISO, ca.gioVao);
    if (idLLV) await AppointmentModel.incShift(idLLV, +1);

    const appt = await AppointmentModel.getById(id);
    return await attachFees(appt);
  },

  /* ===== Common ===== */
  async getById(id) {
    const appt = await AppointmentModel.getById(id);
    return await attachFees(appt);
  },

  async listByPatient(idBenhNhan) {
    const rows = await AppointmentModel.listByPatient(idBenhNhan);
    const out = [];
    for (const r of rows) out.push(await attachFees(r));
    return out;
  },

  async list({ idBacSi = null, ngay = null, limit = 50, offset = 0 }) {
    const rows = await AppointmentModel.list({ idBacSi, ngay, limit, offset });
    const out = [];
    for (const r of rows) out.push(await attachFees(r));
    return out;
  },

  async updateStatus(id, trangThai) {
    if (![1, 2, 3, 5].includes(Number(trangThai))) {
      throw new AppError(400, "Trạng thái không hợp lệ");
    }
    await AppointmentModel.updateStatus(id, Number(trangThai));
  },

  async cancel(id, byWho = "patient") {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { appt, changed } = await AppointmentModel.cancelAndCompact(conn, id);
      if (!appt) throw new AppError(404, "Không tìm thấy lịch hẹn");

      await conn.query(
        "UPDATE LichHen SET lyDoKham=CONCAT(COALESCE(lyDoKham,''),' | cancel by ',?) WHERE idLichHen=?",
        [byWho, id]
      );

      if (changed) {
        const idLLVbyWindow = await AppointmentModel.findOpenShiftForDoctor(appt.idBacSi, appt.ngayHen, appt.gioHen);
        let idLLV = idLLVbyWindow;
        if (!idLLV) {
          idLLV = await AppointmentModel.findShiftByDoctorDateTime(appt.idBacSi, appt.ngayHen, appt.gioHen);
        }
        if (idLLV) {
          await conn.query(
            "UPDATE LichLamViec SET soLuongDaDangKy = GREATEST(0, soLuongDaDangKy - 1) WHERE idLichLamViec=?",
            [idLLV]
          );
        }
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
};
