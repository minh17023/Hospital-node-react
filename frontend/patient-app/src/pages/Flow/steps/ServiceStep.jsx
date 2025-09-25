// src/pages/Flow/steps/ServiceStep.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../../api/client";
import Stepper from "../../../components/Stepper/Stepper";
import s from "./ServiceStep.module.css";

/* ===== helpers ===== */
function calcPriceHalf(basePrice, applyHalf) {
  return {
    total: applyHalf ? Math.round(basePrice * 0.5) : basePrice,
    note: applyHalf ? "Áp dụng giảm 50% BHYT" : "",
  };
}

/* Chuẩn hoá */
const norm = {
  clinic: (c) => ({
    id: c?.idPhongKham ?? c?.id ?? c?.clinicId,
    name: c?.tenPhongKham ?? c?.ten ?? c?.name ?? "Phòng khám",
    active: c?.trangThai === 1 || /active/i.test(String(c?.trangThaiText || "")),
    opening: c?.dangHoatDong ?? c?.opening ?? true,
    statusText: c?.trangThaiText ?? (c?.trangThai === 1 ? "Active" : "Inactive"),
    idBacSi: c?.idBacSi ?? c?.bacSiId ?? c?.doctorId ?? c?.idDoctor ?? null,
    raw: c,
  }),
  doctor: (d) => ({
    id: d?.idBacSi ?? d?.id ?? d?.doctorId ?? d?.idDoctor,
    name: d?.tenBacSi ?? d?.hoTen ?? d?.fullName ?? d?.name ?? "",
    clinicId: d?.idPhongKham ?? d?.clinicId ?? d?.phongKhamId ?? null,
  }),
};

const getPatient = () => {
  try { return JSON.parse(localStorage.getItem("PATIENT_INFO") || "null"); }
  catch { return null; }
};

export default function ServiceStep() {
  const { mode } = useParams(); // "bhyt" | "service" | "booking"
  const nav = useNavigate();

  // reset lựa chọn cũ khi vào step-2
  useEffect(() => { sessionStorage.removeItem("SELECTED_SERVICE"); }, []);

  // cờ giảm 50% BHYT
  const [hasBhyt50, setHasBhyt50] = useState(
    String(sessionStorage.getItem("HAS_VALID_BHYT") ?? localStorage.getItem("HAS_VALID_BHYT")) === "1"
  );
  useEffect(() => {
    const read = () => setHasBhyt50(
      String(sessionStorage.getItem("HAS_VALID_BHYT") ?? localStorage.getItem("HAS_VALID_BHYT")) === "1"
    );
    window.addEventListener("storage", read);
    read();
    return () => window.removeEventListener("storage", read);
  }, []);

  /* specialties */
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  /* modal chọn phòng */
  const [open, setOpen] = useState(false);
  const [svcPicked, setSvcPicked] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [doctorNamesAll, setDoctorNamesAll] = useState([]);

  /* doctors */
  const [doctors, setDoctors] = useState([]);
  const [doctorIdsByClinic, setDoctorIdsByClinic] = useState(new Map());
  const [singleDoctorId, setSingleDoctorId] = useState(null);

  /* modal lịch */
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickedClinic, setPickedClinic] = useState(null);
  const [monthISO, setMonthISO] = useState("");
  const [daysData, setDaysData] = useState([]);
  const [datePicked, setDatePicked] = useState("");
  const [shifts, setShifts] = useState([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);

  /* đặt lịch */
  const [placing, setPlacing] = useState(false);

  const patient = useMemo(() => getPatient(), []);
  const thisMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }, []);

  /* 1) load SPECIALTIES */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rs = await client.get("/specialties");
        const items = rs?.data?.items || rs?.data || [];
        const mapped = items.map(x => ({
          id: x.idChuyenKhoa ?? x.id ?? x.idSpecialty,
          name: x.tenChuyenKhoa ?? x.ten ?? x.name,
          desc: x.moTa ?? "",
          price: Number(x.phiKham ?? 0),
          avgTime: Number(x.thoiGianKhamBinhQuan ?? 30),
          soBacSi: Number(x.soBacSi ?? 0),
          phongKham: x.phongKham ?? null,
          raw: x,
        }));
        setList(mapped);
      } finally { setLoading(false); }
    })();
  }, []);

  /* 2) mở modal phòng */
  const openClinics = async (svc) => {
    setSvcPicked(svc);
    setOpen(true);
    setLoadingClinics(true);
    try {
      const [clinRs, docRs] = await Promise.all([
        client.get(`/specialties/${svc.id}/clinics`),
        client.get(`/specialties/${svc.id}/doctors`),
      ]);
      const clinicItems = (clinRs?.data?.items || clinRs?.data || []).map(norm.clinic);
      const doctorItems = (docRs?.data?.items || docRs?.data || []).map(norm.doctor);

      setDoctors(doctorItems);

      const onlyOneDoctorId = doctorItems.length === 1 ? doctorItems[0].id : null;
      setSingleDoctorId(onlyOneDoctorId);

      const idsMap = new Map();
      const namesMap = new Map();
      const allNames = [];
      doctorItems.forEach(d => {
        if (!d?.id) return;
        const key = d.clinicId || "__NO_CLINIC__";
        if (!idsMap.has(key)) idsMap.set(key, []);
        idsMap.get(key).push(d.id);
        allNames.push(d.name);
        if (d.clinicId) {
          if (!namesMap.has(d.clinicId)) namesMap.set(d.clinicId, new Set());
          if (d.name) namesMap.get(d.clinicId).add(d.name);
        }
      });
      setDoctorIdsByClinic(idsMap);
      const allDoctorNames = [...new Set(allNames.filter(Boolean))];

      const merged = clinicItems.map(c => {
        let idBacSi = c.idBacSi || onlyOneDoctorId;
        const idsOfClinic = idsMap.get(c.id) || [];
        if (!idBacSi && idsOfClinic.length === 1) idBacSi = idsOfClinic[0];

        let names = [];
        if (namesMap.has(c.id)) for (const n of namesMap.get(c.id)) names.push(n);
        if (!names.length && allDoctorNames.length) names = allDoctorNames.slice(0,3);

        return { ...c, idBacSi, doctorNames: [...new Set(names)] };
      });

      setClinics(merged);
      setDoctorNamesAll(allDoctorNames);
    } finally { setLoadingClinics(false); }
  };

  /* 3) CHỌN PHÒNG */
  const chooseClinic = async (clinic) => {
    if (mode === "booking") {
      // ✅ mở modal lịch (thiếu dòng này trước đó)
      setCalendarOpen(true);

      setPickedClinic(clinic);
      setDatePicked(""); setShifts([]); setDaysData([]);
      const month = thisMonth;
      setMonthISO(month);

      // chọn bác sĩ mặc định
      let doctorId =
        clinic.idBacSi ||
        singleDoctorId ||
        (doctorIdsByClinic.get(clinic.id) || [])[0] ||
        doctors[0]?.id || null;

      setPickedClinic(prev => ({ ...prev, idBacSi: doctorId }));

      if (!doctorId) { setDaysData([]); return; }

      try {
        setLoadingDays(true);
        const rs = await client.get(`/doctors/${doctorId}/working-days`, { params: { month } });
        setDaysData(rs?.data?.items || []);
      } finally { setLoadingDays(false); }
      return;
    }

    // Walk-in (bhyt/service)
    try {
      if (!patient?.idBenhNhan) return alert("Thiếu thông tin bệnh nhân.");

      const doctorId =
        clinic.idBacSi ||
        singleDoctorId ||
        (doctorIdsByClinic.get(clinic.id) || [])[0] ||
        doctors[0]?.id || null;

      if (!doctorId) return alert("Không xác định được bác sĩ.");

      setPlacing(true);

      const loaiKham = mode === "bhyt" ? 1 : 2;
      const payload = {
        idBenhNhan: patient.idBenhNhan,
        idPhongKham: clinic.id,
        idBacSi: doctorId,
        idChuyenKhoa: svcPicked.id, // <- bắt buộc
        loaiKham,
        lyDoKham: `Walk-in ${svcPicked?.name || ""}`,
      };

      const { data } = await client.post("/appointments/walkin", payload);

      // cache
      sessionStorage.setItem("APPOINTMENT_RESULT", JSON.stringify(data));

      const applyHalf = (mode === "bhyt" || mode === "booking") && hasBhyt50;
      const priceInfo = calcPriceHalf(svcPicked.price, applyHalf);
      sessionStorage.setItem("SELECTED_SERVICE", JSON.stringify({
        id: svcPicked.id, name: svcPicked.name, price: svcPicked.price,
        avgTime: svcPicked.avgTime, priceInfo, mode,
        clinic: { id: clinic.id, name: clinic.name, status: clinic.statusText, doctorNames: clinic.doctorNames, idBacSi: doctorId },
      }));

      nav(`/flow/${mode}/step-3?id=${data.idLichHen}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Đặt lịch trực tiếp thất bại");
    } finally { setPlacing(false); }
  };

  /* đổi tháng */
  const changeMonth = async (delta) => {
    const [y, m] = monthISO.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    const nextISO = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}`;
    setMonthISO(nextISO);

    if (!pickedClinic?.idBacSi) return;
    try {
      setLoadingDays(true);
      const rs = await client.get(`/doctors/${pickedClinic.idBacSi}/working-days`, { params: { month: nextISO } });
      setDaysData(rs?.data?.items || []);
    } finally { setLoadingDays(false); }
  };

  /* chọn ngày -> nạp ca */
  const pickDate = async (dStr) => {
    if (!pickedClinic?.idBacSi) return;
    setDatePicked(dStr);
    try {
      setLoadingShifts(true);
      const rs = await client.get(`/doctors/${pickedClinic.idBacSi}/shifts`, { params: { ngayLamViec: dStr } });
      setShifts(rs?.data?.items || []);
    } finally { setLoadingShifts(false); }
  };

  /* chọn ca -> BOOKING ONLINE (API mới) */
  const pickShiftAndGo = async (shift) => {
    try {
      if (!patient?.idBenhNhan) return alert("Thiếu thông tin bệnh nhân.");
      setPlacing(true);

      const loaiKham = mode === "bhyt" ? 1 : 2;
      const idBacSi = pickedClinic.idBacSi ?? shift.idBacSi ?? singleDoctorId ?? null;

      const payload = {
        idBenhNhan: patient.idBenhNhan,
        idBacSi,
        idChuyenKhoa: svcPicked.id,
        loaiKham,
        lyDoKham: `Booking ${svcPicked?.name || ""}`,
      };

      // ⬇️ dùng endpoint mới: /appointments/booking/:idLichLamViec
      const { data } = await client.post(`/appointments/booking/${shift.idLichLamViec}`, payload);

      const applyHalf = (mode === "bhyt" || mode === "booking") && hasBhyt50;
      const priceInfo = calcPriceHalf(svcPicked.price, applyHalf);
      sessionStorage.setItem("SELECTED_SERVICE", JSON.stringify({
        id: svcPicked.id,
        name: svcPicked.name,
        price: svcPicked.price,
        avgTime: svcPicked.avgTime,
        priceInfo,
        mode,
        clinic: {
          id: pickedClinic.id,
          name: pickedClinic.name,
          status: pickedClinic.statusText,
          doctorNames: pickedClinic.doctorNames,
          idBacSi,
        },
        booking: {
          idLichLamViec: shift.idLichLamViec,
          idCaLamViec: shift.idCaLamViec,
          tenCaLamViec: shift.tenCaLamViec,
          ngayLamViec: shift.ngayLamViec,
          gioVao: shift.gioVao,
          gioRa: shift.gioRa,
        }
      }));

      sessionStorage.setItem("APPOINTMENT_RESULT", JSON.stringify(data));
      setCalendarOpen(false);
      setOpen(false);
      nav(`/flow/${mode}/step-3?id=${data.idLichHen}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Đặt lịch online thất bại");
    } finally { setPlacing(false); }
  };

  return (
    <div className="container-fluid py-4">
      <div className={s.shell}>
        <Stepper step={2} />

        <div className={s.hero}>
          <h2>Chọn Dịch Vụ Khám</h2>
          <p>Chọn dịch vụ y tế phù hợp với nhu cầu của bạn</p>
        </div>

        {loading ? (
          <div className={s.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${s.card} ${s.skeleton}`} />
            ))}
          </div>
        ) : (
          <div className={s.grid}>
            {list.map((svc) => {
              const showHalf = (mode === "bhyt" || mode === "booking") && hasBhyt50;
              return (
                <div key={svc.id} className={s.card}>
                  <div className={s.head}>
                    <div className={s.iconBox}>🩺</div>
                    <div className={s.titleWrap}>
                      <div className={s.title}>{svc.name}</div>
                      {svc.desc && <div className={s.subtitle}>{svc.desc}</div>}
                    </div>
                    <div className={s.price}>
                      {showHalf ? (
                        <>
                          <span className={s.oldPrice}>{svc.price.toLocaleString("vi-VN")}đ</span>
                          <span>{Math.round(svc.price * 0.5).toLocaleString("vi-VN")} VND</span>
                          <span className={s.badge}>-50% BHYT</span>
                        </>
                      ) : (
                        <span>{svc.price.toLocaleString("vi-VN")} VND</span>
                      )}
                    </div>
                  </div>

                  <ul className={s.meta}>
                    <li>• Thời gian: ~{svc.avgTime} phút</li>
                    {svc.soBacSi != null && <li>• Số bác sĩ: {svc.soBacSi}</li>}
                    {svc.phongKham && <li>• Phòng khám: {svc.phongKham}</li>}
                  </ul>

                  <div className={s.hr} />
                  <button
                    disabled={placing}
                    className="btn btn-primary w-100"
                    onClick={() => openClinics(svc)}
                  >
                    {placing ? "Đang xử lý..." : "Chọn dịch vụ này"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Chọn Phòng */}
      {open && (
        <div className={s.modal} role="dialog" aria-modal="true">
          <div className={s.backdrop} onClick={() => setOpen(false)} />
          <div className={s.dialog} role="document">
            <div className={s.dHead}>
              <div>
                <div className={s.dTitle}>Chọn Phòng Khám</div>
                {svcPicked && <div className={s.dSub}>Dịch vụ: {svcPicked.name}</div>}
                {doctorNamesAll?.length > 0 && (
                  <div className={s.dHint}>Bác sĩ chuyên khoa: {doctorNamesAll.join(", ")}</div>
                )}
                {(mode === "bhyt" || mode === "booking") && hasBhyt50 && (
                  <div className={s.badge}>Đang áp dụng -50% BHYT</div>
                )}
              </div>
              <button className={s.close} onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>

            <div className={s.dBody}>
              {loadingClinics ? (
                <div className={s.loading}>Đang tải phòng khám…</div>
              ) : clinics.length === 0 ? (
                <div className={s.empty}>Chưa có phòng khám khả dụng</div>
              ) : (
                <div className={s.clinicGrid}>
                  {clinics.map((c) => (
                    <div key={c.id} className={s.clinicCard}>
                      <div className={s.cRow}>
                        <div className={s.cIcon}>📍</div>
                        <div className={s.cName}>{c.name}</div>
                        {c.active && <div className={s.cOk}>✓</div>}
                      </div>
                      <div className={s.cMeta}>
                        {c.doctorNames?.length > 0 && <div>👤 Bác sĩ: {c.doctorNames.join(", ")}</div>}
                        <div>⏺ {c.opening ? "Đang hoạt động" : "Tạm ngưng"}</div>
                      </div>
                      <div className={s.hrThin} />
                      <button
                        disabled={placing}
                        className="btn btn-success w-100"
                        onClick={() => chooseClinic(c)}
                      >
                        {mode === "booking" ? "Chọn phòng này" : (placing ? "Đang đặt..." : "Chọn phòng này")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal chọn Ngày & Ca (ONLINE) */}
      {calendarOpen && (
        <div className={s.modal} role="dialog" aria-modal="true">
          <div className={s.backdrop} onClick={() => setCalendarOpen(false)} />
          <div className={s.dialog} role="document">
            <div className={s.dHead}>
              <div>
                <div className={s.dTitle}>Chọn Ngày và Ca Khám</div>
                {svcPicked && pickedClinic && (
                  <div className={s.dSub}>
                    Dịch vụ: <b>{svcPicked.name}</b> — Phòng: <b>{pickedClinic.name}</b>
                  </div>
                )}
              </div>
              <button className={s.close} onClick={() => setCalendarOpen(false)} aria-label="Đóng">✕</button>
            </div>

            <div className={s.dBody}>
              <div className={s.monthNav}>
                <button className="btn btn-light" onClick={() => changeMonth(-1)}>◀</button>
                <div className={s.monthLabel}>tháng {monthISO.split("-")[1]} {monthISO.split("-")[0]}</div>
                <button className="btn btn-light" onClick={() => changeMonth(1)}>▶</button>
              </div>

              <div className={s.calendarGrid}>
                {loadingDays ? (
                  <div className={s.loading}>Đang tải ngày có ca…</div>
                ) : daysData?.length ? (
                  daysData.map(d => {
                    const left = Number(d.soLuongBenhNhanToiDa) - Number(d.soLuongDaDangKy);
                    const isPicked = datePicked === d.ngayLamViec;
                    return (
                      <button
                        key={d.ngayLamViec}
                        className={`${s.calCell} ${isPicked ? s.active : ""}`}
                        onClick={() => pickDate(d.ngayLamViec)}
                        title={`Còn ${left} chỗ`}
                      >
                        <div className={s.calDay}>{d.ngayLamViec.slice(-2)}</div>
                        <div className={s.calLeft}>{left} chỗ</div>
                      </button>
                    );
                  })
                ) : (
                  <div className={s.empty}>Chưa có ca trong tháng này</div>
                )}
              </div>

              <div className={s.hr} />
              <div className={s.shiftList}>
                {!datePicked ? (
                  <div className={s.hint}>Chọn ngày để xem ca khám</div>
                ) : loadingShifts ? (
                  <div className={s.loading}>Đang tải ca…</div>
                ) : shifts?.length ? (
                  shifts.map(sh => {
                    const left = Number(sh.soLuongBenhNhanToiDa) - Number(sh.soLuongDaDangKy);
                    return (
                      <div key={sh.idLichLamViec} className={s.shiftRow}>
                        <div>
                          <div className={s.shiftName}>{sh.tenCaLamViec}</div>
                          <div className={s.shiftTime}>{sh.gioVao} - {sh.gioRa}</div>
                        </div>
                        <div className={s.shiftMeta}>Còn {left} chỗ</div>
                        <button
                          disabled={placing}
                          className="btn btn-success"
                          onClick={() => pickShiftAndGo(sh)}
                        >
                          {placing ? "Đang đặt..." : "Chọn ca này"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className={s.empty}>Ngày {datePicked} chưa có ca</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
