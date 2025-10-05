// src/pages/Flow/steps/AppointmentStep.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import client from "../../../api/client";
import Stepper from "../../../components/Stepper/Stepper";
import s from "./AppointmentStep.module.css";

/* ========= helpers ========= */
const getFromSS = (k, d = null) => {
  try { return JSON.parse(sessionStorage.getItem(k) || "null") ?? d; }
  catch { return d; }
};
const getPatient = () => {
  try { return JSON.parse(localStorage.getItem("PATIENT_INFO") || "null"); }
  catch { return null; }
};
const toMs = (dtStr) => {
  if (!dtStr) return null;
  const iso = dtStr.includes("T") ? dtStr : dtStr.replace(" ", "T");
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};
const pad2 = (n) => String(n).padStart(2, "0");
const formatDateVN = (d) => {
  if (!d) return "--";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

export default function AppointmentStep() {
  const { mode } = useParams(); // "bhyt" | "service" | "booking" (tham chiếu UI)
  const navigate = useNavigate();
  const q = new URLSearchParams(useLocation().search);
  // ưu tiên ?ma=..., tương thích cũ ?id=...
  const codeFromQuery = q.get("ma") || q.get("id");

  // core states
  const [loading, setLoading] = useState(true);
  const [appt, setAppt] = useState(null);
  const [error, setError] = useState("");

  // payment states
  const [payInitLoading, setPayInitLoading] = useState(true);
  const [payment, setPayment] = useState(null);   // { id, status, amount, qrUrl, transferContent, paidAt, expireAt }
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [countdown, setCountdown] = useState("--:--");
  const [payError, setPayError] = useState("");

  // refs
  const pollRef = useRef(null);
  const countdownRef = useRef(null);

  // cached infos
  const patient = useMemo(() => getPatient(), []);
  const pickedService = useMemo(() => getFromSS("SELECTED_SERVICE", null), []);
  const resultCache = useMemo(() => getFromSS("APPOINTMENT_RESULT", null), []);
  const apptCodeFromCache = resultCache?.maLichHen || resultCache?.idLichHen || null;

  /* 1) Load appointment theo MÃ */
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true); setError("");
      try {
        const code = codeFromQuery || apptCodeFromCache;
        if (!code) throw new Error("Không tìm thấy lịch hẹn vừa tạo.");

        // API mới: GET /appointments/:ma
        const rs = await client.get(`/appointments/${code}`);
        if (!mounted) return;
        setAppt(rs?.data);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.message || "Lỗi tải lịch hẹn");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
  }, [codeFromQuery, apptCodeFromCache]);

  /* 2) Khi có appointment -> nếu chưa thanh toán thì khởi tạo/tái sử dụng order */
  useEffect(() => {
    const ma = appt?.maLichHen || appt?.idLichHen;
    if (!ma) return;

    if (Number(appt?.trangThai) === 2) {
      // Đã thanh toán/đăng ký hoàn tất (server authority)
      setPaid(true);
      setPayment(null);
      setPayInitLoading(false);
      setExpired(false);
      setCountdown("--:--");
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      return;
    }

    startPayment(ma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.maLichHen, appt?.idLichHen, appt?.trangThai]);

  async function startPayment(maLichHen) {
    // reset
    setPayError("");
    setPayInitLoading(true);
    setExpired(false);
    setPaid(false);
    setPayment(null);
    setCountdown("--:--");
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }

    try {
      // API mới: POST /payments  body: { maLichHen }
      const { data } = await client.post("/payments", { maLichHen });

      // ép hạn client 3' nếu server không có expireAt
      const clientExpireAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      const merged = { ...data, expireAt: data?.expireAt || clientExpireAt };

      setPayment(merged);
      startCountdown(merged.expireAt);

      // Poll GET /payments/:maDonHang
      pollRef.current = setInterval(async () => {
        try {
          const rs = await client.get(`/payments/${merged.id}`);
          const p = rs?.data || {};
          setPayment(prev => ({ ...(prev || {}), status: p.status, paidAt: p.paidAt }));

          if (p.status === "PAID") {
            setPaid(true);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }

            // Refresh lại appointment (để lấy trạng thái/phiDaGiam mới nhất)
            try {
              const rs2 = await client.get(`/appointments/${maLichHen}`);
              setAppt(rs2?.data);
            } catch {}
          } else {
            const nowMs = Date.now();
            const expMs = toMs(merged.expireAt);
            if (expMs && nowMs >= expMs) {
              setExpired(true);
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
              if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
            }
          }
        } catch {
          // bỏ qua 1 tick
        }
      }, 3000);
    } catch (e) {
      setPayError(e?.response?.data?.message || e?.message || "Không thể tạo đơn thanh toán");
    } finally {
      setPayInitLoading(false);
    }
  }

  function startCountdown(expireAtStr) {
    const tick = () => {
      const end = toMs(expireAtStr);
      if (!end) { setCountdown("--:--"); return; }
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const mm = pad2(Math.floor(diff / 60));
      const ss = pad2(diff % 60);
      setCountdown(`${mm}:${ss}`);
      if (diff <= 0) {
        setExpired(true);
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  }

  const onPrint = () =>
    paid ? window.print() : alert("Vui lòng hoàn tất thanh toán trước khi in phiếu khám.");
  const goHome = () => navigate("/menu");

  /* ========= Render ========= */
  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className={s.shell}>
          <Stepper step={3} />
          <div className={s.loading}>Đang tải phiếu hẹn…</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className={s.shell}>
          <Stepper step={3} />
          <div className={s.error}>
            {error}
            <div className="mt-3">
              <button className="btn btn-primary" onClick={goHome}>Về trang chính</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!appt) return null;

  // Giá hiển thị: ưu tiên server (phiDaGiam/phiKhamGoc), fallback service đã chọn
  const baseFee = Number(appt.phiKhamGoc ?? pickedService?.price ?? 0);
  const priceShow = Number(appt.phiDaGiam ?? pickedService?.priceInfo?.total ?? baseFee);
  const discountNote =
    appt.phiDaGiam != null && appt.phiDaGiam !== baseFee
      ? "Áp dụng giảm 50% BHYT"
      : (pickedService?.priceInfo?.note || "");

  const bn = patient || {};
  const svName = pickedService?.name || appt.tenChuyenKhoa || "--";
  const roomName = pickedService?.clinic?.name || appt.tenPhongKham || "--";
  const bsName = appt.tenBacSi || (pickedService?.clinic?.doctorNames?.[0]) || "--";
  const maLichHen = appt?.maLichHen || appt?.idLichHen;

  return (
    <div className="container-fluid py-4">
      <div className={s.shell}>
        <Stepper step={3} />
        <div className={s.title}>Hoàn Thành Đăng Ký</div>
        <div className={s.subtitle}>Kiểm tra thông tin và in phiếu khám</div>

        <div className={s.grid}>
          {/* Thông tin bệnh nhân */}
          <div className={s.card}>
            <div className={s.cardHead}>Thông Tin Bệnh Nhân</div>
            <div className={s.row}><span>Họ tên:</span><b>{bn.hoTen || appt.tenBenhNhan || "--"}</b></div>
            <div className={s.row}><span>CCCD:</span><b>{bn.soCCCD || appt.soCCCD || "--"}</b></div>
            <div className={s.row}><span>Ngày sinh:</span><b>{bn.ngaySinh || "--"}</b></div>
            <div className={s.row}><span>Giới tính:</span><b>{bn.gioiTinh === "F" ? "Nữ" : bn.gioiTinh === "M" ? "Nam" : "--"}</b></div>
            <div className={s.row}><span>SDT:</span><b>{bn.soDienThoai || "--"}</b></div>
          </div>

          {/* Thông tin khám */}
          <div className={s.card}>
            <div className={s.cardHead}>Thông Tin Khám</div>
            <div className={s.row}><span>Dịch vụ:</span><b>{svName}</b></div>
            <div className={s.row}><span>Phòng:</span><b>{roomName}</b></div>
            <div className={s.row}><span>Bác sĩ:</span><b>{bsName}</b></div>
            <div className={s.row}><span>Số thứ tự:</span><b>{appt.sttKham ?? "--"}</b></div>

            <div className={s.row}>
              <span>Giá:</span>
              <b>
                {priceShow.toLocaleString("vi-VN")} đ
                {discountNote ? <span className={s.note}>&nbsp;({discountNote})</span> : null}
              </b>
            </div>

            <div className={s.row}>
              <span>Thời gian:</span>
              <b>{(appt.gioHen || "").slice(0, 5)} {formatDateVN(appt.ngayHen)}</b>
            </div>

            <div className={s.row}>
              <span>Trạng thái thanh toán:</span>
              {paid ? (
                <b className={s.badgeSuccess}>Đã thanh toán</b>
              ) : (
                <b className={s.badgeDanger}>Đang chờ thanh toán</b>
              )}
            </div>
          </div>

          {/* QR Thanh toán */}
          <div className={s.qrCard}>
            <div className={s.qrTitle}>QR thanh toán</div>

            {payInitLoading ? (
              <div className={s.loading}>Đang tạo mã thanh toán…</div>
            ) : paid ? (
              <div className={s.paidBox}>✅ Thanh toán thành công!</div>
            ) : payError ? (
              <div className={s.error}>{payError}</div>
            ) : payment ? (
              <>
                {!expired ? (
                  <>
                    <img className={s.qrImg} alt="QR thanh toán" src={payment.qrUrl} />
                    <div className={s.qrMeta}>
                      <div>Số tiền: <b>{Number(payment.amount).toLocaleString("vi-VN")} đ</b></div>
                      <div>Nội dung CK: <code>{payment.transferContent}</code></div>
                      <div>Hết hạn sau: <b>{countdown}</b></div>
                    </div>
                    <div className="mt-2">
                      <button className="btn btn-outline-secondary btn-sm" disabled>Đang hiệu lực</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={s.warn}>Mã đã hết hạn (quá 3 phút).</div>
                    <button
                      className="btn btn-outline-secondary btn-sm mt-2"
                      onClick={() => startPayment(maLichHen)}
                    >
                      Tạo lại mã QR
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className={s.error}>Không thể tạo đơn thanh toán</div>
            )}
          </div>
        </div>

        <div className={s.actions}>
          <button className="btn btn-secondary" onClick={goHome}>Về trang chủ</button>
          <button
            className="btn btn-primary"
            onClick={onPrint}
            disabled={!paid}
            title={paid ? "In phiếu khám" : "Cần hoàn tất thanh toán để in phiếu"}
          >
            {paid ? "In Phiếu Khám" : "Chưa thể in"}
          </button>
        </div>

        <div className={s.help}>
          <ul>
            <li>Vui lòng hoàn tất thanh toán trước khi in phiếu khám.</li>
            <li>Đến phòng khám đúng giờ hẹn.</li>
            <li>Mang theo phiếu khám và giấy tờ tuỳ thân.</li>
            <li>Liên hệ tổng đài nếu cần hỗ trợ.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
