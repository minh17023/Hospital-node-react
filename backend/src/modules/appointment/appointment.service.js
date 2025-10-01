import { AppError } from "../../core/http/error.js";
import { AppointmentModel } from "./appointment.model.js";
import { pool } from "../../config/db.js";

const need = (v, name) => {
  if (v === undefined || v === null || v === "") throw new AppError(400, `Thiếu ${name}`);
};
const pad = (n) => String(n).padStart(2, "0");

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

      // Khoá ca
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

      // Sức chứa
      const [[{ n: used }]] = await conn.query(
        `SELECT COUNT(*) n
           FROM LichHen
          WHERE idBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1`,
        [ca.idBacSi, ca.ngayLamViec, ca.gioVao]
      );
      if (used >= Number(ca.soLuongBenhNhanToiDa)) throw new AppError(409, "Ca đã đầy");

      // Chống trùng
      const [dup] = await conn.query(
        `SELECT 1
           FROM LichHen
          WHERE idBenhNhan=? AND idBacSi=? AND ngayHen=? AND gioHen=? AND trangThai<>-1
          LIMIT 1`,
        [idBenhNhan, ca.idBacSi, ca.ngayLamViec, ca.gioVao]
      );
      if (dup.length) throw new AppError(409, "Bạn đã đặt lịch trong ca này");

      // === TÍNH GIÁ & LƯU SNAPSHOT ===
      const base = await AppointmentModel.getDoctorFee(idBacSi);
      const hasBHYT = await AppointmentModel.hasValidBHYTByPatient(idBenhNhan);
      const phiKhamGoc = base;
      const phiDaGiam  = hasBHYT ? Math.round(base * 0.5) : base;

      const stt = Number(used) + 1;
      const [rs] = await conn.query(
        `INSERT INTO LichHen
         (idBenhNhan,idBacSi,idChuyenKhoa,ngayHen,gioHen,loaiKham,lyDoKham,
          hinhThuc,trangThai,sttKham,phiKhamGoc,phiDaGiam,ngayTao)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?, NOW())`,
        [idBenhNhan, idBacSi, idChuyenKhoa, ca.ngayLamViec, ca.gioVao,
         loaiKham, lyDoKham || null, 2, 1, stt, phiKhamGoc, phiDaGiam]
      );

      await conn.query(
        "UPDATE LichLamViec SET soLuongDaDangKy = soLuongDaDangKy + 1 WHERE idLichLamViec=?",
        [idLichLamViec]
      );

      await conn.commit();
      return await AppointmentModel.getById(rs.insertId);
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

    // === TÍNH GIÁ & LƯU SNAPSHOT ===
    const base = await AppointmentModel.getDoctorFee(idBacSi);
    const hasBHYT = await AppointmentModel.hasValidBHYTByPatient(idBenhNhan);
    const phiKhamGoc = base;
    const phiDaGiam  = hasBHYT ? Math.round(base * 0.5) : base;

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
      sttKham: stt,
      phiKhamGoc,
      phiDaGiam
    });

    const idLLV = await AppointmentModel.findShiftByDoctorDateTime(idBacSi, ngayISO, ca.gioVao);
    if (idLLV) await AppointmentModel.incShift(idLLV, +1);

    return await AppointmentModel.getById(id);
  },

  /* ===== Common ===== */
  async getById(id) { return await AppointmentModel.getById(id); },

  async listByPatient(idBenhNhan, opts = {}) {
    return await AppointmentModel.listByPatient(idBenhNhan, opts);
  },

  async list({ idBacSi = null, ngay = null, limit = 50, offset = 0 }) {
    return await AppointmentModel.list({ idBacSi, ngay, limit, offset });
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
  
      // 1) Khóa bản ghi lịch hẹn
      const [[curr]] = await conn.query(
        `SELECT * FROM LichHen WHERE idLichHen=? FOR UPDATE`, [id]
      );
      if (!curr) throw new AppError(404, "Không tìm thấy lịch hẹn");
  
      // 2) Idempotent: đã hủy rồi thì thoát sớm, không đụng ca
      if (Number(curr.trangThai) === -1) {
        await conn.commit();
        return;
      }
  
      // 3) Đặt trạng thái = -1 (đã hủy)
      await conn.query(
        `UPDATE LichHen SET trangThai=-1 WHERE idLichHen=?`,
        [id]
      );
  
      // 4) Nén hàng đợi trong cùng slot (bác sĩ, ngày, giờ)
      await conn.query(
        `UPDATE LichHen
            SET sttKham = sttKham - 1
          WHERE idBacSi=? AND ngayHen=? AND gioHen=?
            AND trangThai<>-1 AND sttKham > ?`,
        [curr.idBacSi, curr.ngayHen, curr.gioHen, curr.sttKham]
      );
  
      // 5) Ghi chú người hủy
      await conn.query(
        `UPDATE LichHen
            SET lyDoKham = CONCAT(COALESCE(lyDoKham,''),' | cancel by ',?)
          WHERE idLichHen=?`,
        [byWho, id]
      );
  
      // 6) Giảm đúng ca: ưu tiên khớp theo cửa sổ giờ chứa gioHen;
      //    nếu không có (trường hợp booking gioHen == gioVao), fallback theo gioVao
      let idLLV = await AppointmentModel.findShiftByDoctorDateAndTimeWindow(
        curr.idBacSi, curr.ngayHen, curr.gioHen
      );
      if (!idLLV) {
        idLLV = await AppointmentModel.findShiftByDoctorDateTime(
          curr.idBacSi, curr.ngayHen, curr.gioHen
        );
      }
      if (idLLV) {
        await conn.query(
          `UPDATE LichLamViec
              SET soLuongDaDangKy = GREATEST(0, soLuongDaDangKy - 1)
            WHERE idLichLamViec=?`,
          [idLLV]
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
}  