import { AppError } from "../../core/http/error.js";
import { AppointmentModel } from "./appointment.model.js";
import { pool } from "../../config/db.js";

const need = (v, name) => {
  if (v === undefined || v === null || v === "") throw new AppError(400, `Thiếu ${name}`);
};
const pad = (n) => String(n).padStart(2, "0");

export const AppointmentService = {
  /* ===== Online (Booking) ===== */
  async createOnline(maLichLamViec, body) {
    need(maLichLamViec, "maLichLamViec");
    const { maBenhNhan, maBacSi, maChuyenKhoa, loaiKham, lyDoKham } = body || {};
    need(maBenhNhan, "maBenhNhan");
    need(maBacSi, "maBacSi");
    need(maChuyenKhoa, "maChuyenKhoa");
    need(loaiKham, "loaiKham");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Khoá ca
      const [rows] = await conn.query(
        `SELECT llv.*, clv.gioVao
           FROM lichlamviec llv
           JOIN calamviec clv ON clv.maCaLamViec = llv.maCaLamViec
          WHERE llv.maLichLamViec=? FOR UPDATE`,
        [maLichLamViec]
      );
      const ca = rows[0];
      if (!ca) throw new AppError(404, "Ca không tồn tại");
      if (String(ca.maBacSi) !== String(maBacSi))
        throw new AppError(400, "Bác sĩ không khớp với ca");

      // Sức chứa
      const [[{ n: used }]] = await conn.query(
        `SELECT COUNT(*) n
           FROM lichhen
          WHERE maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1`,
        [ca.maBacSi, ca.ngayLamViec, ca.gioVao]
      );
      if (used >= Number(ca.soLuongBenhNhanToiDa)) throw new AppError(409, "Ca đã đầy");

      // Chống trùng
      const [dup] = await conn.query(
        `SELECT 1
           FROM lichhen
          WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1
          LIMIT 1`,
        [maBenhNhan, ca.maBacSi, ca.ngayLamViec, ca.gioVao]
      );
      if (dup.length) throw new AppError(409, "Bạn đã đặt lịch trong ca này");

      // === TÍNH GIÁ & LƯU SNAPSHOT ===
      const base = await AppointmentModel.getDoctorFee(maBacSi);
      const hasBHYT = await AppointmentModel.hasValidBHYTByPatient(maBenhNhan);
      const phiKhamGoc = base;
      const phiDaGiam  = hasBHYT ? Math.round(base * 0.5) : base;

      const stt = Number(used) + 1;
      const [rs] = await conn.query(
        `INSERT INTO lichhen
         (maBenhNhan,maBacSi,maChuyenKhoa,ngayHen,gioHen,loaiKham,lyDoKham,
          hinhThuc,trangThai,sttKham,phiKhamGoc,phiDaGiam,ngayTao)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW())`,
        [maBenhNhan, maBacSi, maChuyenKhoa, ca.ngayLamViec, ca.gioVao,
         loaiKham, lyDoKham || null, 2, 1, stt, phiKhamGoc, phiDaGiam]
      );

      await conn.query(
        "UPDATE lichlamviec SET soLuongDaDangKy = soLuongDaDangKy + 1 WHERE maLichLamViec=?",
        [maLichLamViec]
      );

      // lấy mã lịch hẹn vừa tạo
      const [back] = await conn.query(
        `SELECT maLichHen FROM lichhen
          WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=? AND gioHen=?
          ORDER BY maLichHen DESC LIMIT 1`,
        [maBenhNhan, maBacSi, ca.ngayLamViec, ca.gioVao]
      );

      await conn.commit();
      return await AppointmentModel.getById(back[0].maLichHen);
    } catch (e) {
      await conn.rollback();
      if (e && e.code === "ER_DUP_ENTRY") throw new AppError(409, "Bạn đã đặt lịch trong ca này");
      throw e;
    } finally {
      conn.release();
    }
  },

  /* ===== Walk-in ===== */
  async createWalkin(body) {
    const { maBenhNhan, maBacSi, maChuyenKhoa, loaiKham, lyDoKham } = body || {};
    need(maBenhNhan, "maBenhNhan");
    need(maBacSi, "maBacSi");
    need(maChuyenKhoa, "maChuyenKhoa");
    need(loaiKham, "loaiKham");

    const now = new Date();
    const ngayISO = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const gioNow  = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const ca = await AppointmentModel.findOpenShiftForDoctor(maBacSi, ngayISO, gioNow);
    if (!ca) throw new AppError(409, "Hiện bác sĩ không có ca làm việc.");

    const used = await AppointmentModel.countInWindow(maBacSi, ngayISO, ca.gioVao, ca.gioRa);
    if (used >= Number(ca.soLuongBenhNhanToiDa)) throw new AppError(409, "Ca đã đầy");

    const [dupRows] = await pool.query(
      `SELECT 1 FROM lichhen
        WHERE maBenhNhan=? AND maBacSi=? AND ngayHen=?
          AND gioHen >= ? AND gioHen < ? AND trangThai<>-1
        LIMIT 1`,
      [maBenhNhan, maBacSi, ngayISO, ca.gioVao, ca.gioRa]
    );
    if (dupRows.length) throw new AppError(409, "Bạn đã có lịch trong ca này");

    const base = await AppointmentModel.getDoctorFee(maBacSi);
    const hasBHYT = await AppointmentModel.hasValidBHYTByPatient(maBenhNhan);
    const phiKhamGoc = base;
    const phiDaGiam  = hasBHYT ? Math.round(base * 0.5) : base;

    const stt = Number(used) + 1;

    const ma = await AppointmentModel.insert({
      maBenhNhan,
      maBacSi,
      maChuyenKhoa,
      ngayHen: ngayISO,
      gioHen: gioNow,
      loaiKham,
      lyDoKham: lyDoKham || "Đặt trực tiếp",
      hinhThuc: 1,
      trangThai: 1,
      sttKham: stt,
      phiKhamGoc,
      phiDaGiam
    });

    const maLLV = await AppointmentModel.findShiftByDoctorDateTime(maBacSi, ngayISO, ca.gioVao);
    if (maLLV) await AppointmentModel.incShift(maLLV, +1);

    return await AppointmentModel.getById(ma);
  },

  /* ===== Common ===== */
  async getById(ma) { return await AppointmentModel.getById(ma); },

  async listByPatient(maBenhNhan, opts = {}) {
    return await AppointmentModel.listByPatient(maBenhNhan, opts);
  },

  async list({ maBacSi = null, ngay = null, limit = 50, offset = 0 }) {
    return await AppointmentModel.list({ maBacSi, ngay, limit, offset });
  },

  async updateStatus(ma, trangThai) {
    if (![1, 2, 3, 5].includes(Number(trangThai))) {
      throw new AppError(400, "Trạng thái không hợp lệ");
    }
    await AppointmentModel.updateStatus(ma, Number(trangThai));
  },

  async cancel(ma, byWho = "patient") {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
  
      // 1) Khoá bản ghi lịch hẹn
      const [[curr]] = await conn.query(
        `SELECT * FROM lichhen WHERE maLichHen=? FOR UPDATE`, [ma]
      );
      if (!curr) throw new AppError(404, "Không tìm thấy lịch hẹn");
  
      // 2) Idempotent
      if (Number(curr.trangThai) === -1) {
        await conn.commit();
        return;
      }
  
      // 3) Hủy
      await conn.query(
        `UPDATE lichhen SET trangThai=-1 WHERE maLichHen=?`,
        [ma]
      );
  
      // 4) Nén hàng đợi
      await conn.query(
        `UPDATE lichhen
            SET sttKham = sttKham - 1
          WHERE maBacSi=? AND ngayHen=? AND gioHen=?
            AND trangThai<>-1 AND sttKham > ?`,
        [curr.maBacSi, curr.ngayHen, curr.gioHen, curr.sttKham]
      );
  
      // 5) Ghi chú người hủy
      await conn.query(
        `UPDATE lichhen
            SET lyDoKham = CONCAT(COALESCE(lyDoKham,''),' | cancel by ',?)
          WHERE maLichHen=?`,
        [byWho, ma]
      );
  
      // 6) Giảm đúng ca
      let maLLV = await AppointmentModel.findShiftByDoctorDateAndTimeWindow(
        curr.maBacSi, curr.ngayHen, curr.gioHen
      );
      if (!maLLV) {
        maLLV = await AppointmentModel.findShiftByDoctorDateTime(
          curr.maBacSi, curr.ngayHen, curr.gioHen
        );
      }
      if (maLLV) {
        await conn.query(
          `UPDATE lichlamviec
              SET soLuongDaDangKy = GREATEST(0, soLuongDaDangKy - 1)
            WHERE maLichLamViec=?`,
          [maLLV]
        );
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