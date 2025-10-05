import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../../api/client";
import Stepper from "../../../components/Stepper/Stepper";
import s from "./ServiceStep.module.css";

/* ===== helpers ===== */
const now = () => new Date();
const yyyy_mm = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const isSameISODate = (iso, d = new Date()) => {
  const [y, m, dd] = iso.split("-").map(Number);
  return y === d.getFullYear() && m === d.getMonth() + 1 && dd === d.getDate();
};
const timeToMinutes = (hhmm) => {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
};
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
function calcPriceHalf(basePrice, applyHalf) {
  return {
    total: applyHalf ? Math.round(basePrice * 0.5) : basePrice,
    note: applyHalf ? "Áp dụng giảm 50% BHYT" : "",
  };
}

/* Chuẩn hoá: CHỈ dùng mã (ma*) */
const norm = {
  clinic: (c) => ({
    maPhongKham:
      c?.maPhongKham ?? c?.idPhongKham ?? c?.clinicCode ?? c?.clinicId,
    tenPhongKham: c?.tenPhongKham ?? c?.ten ?? c?.name ?? "Phòng khám",
    active: c?.trangThai === 1 || /active/i.test(String(c?.trangThaiText || "")),
    opening: c?.dangHoatDong ?? c?.opening ?? true,
    trangThaiText: c?.trangThaiText ?? (c?.trangThai === 1 ? "Active" : "Inactive"),
    maBacSiChuQuan:
      c?.maBacSi ?? c?.idBacSi ?? c?.bacSiId ?? c?.doctorId ?? null,
    raw: c,
  }),
  doctor: (d) => ({
    maBacSi: d?.maBacSi ?? d?.idBacSi ?? d?.doctorId ?? d?.id,
    tenBacSi: d?.tenBacSi ?? d?.hoTen ?? d?.fullName ?? d?.name ?? "",
    maPhongKham: d?.maPhongKham ?? d?.idPhongKham ?? d?.clinicId ?? null,
  }),
};

const getPatient = () => {
  try {
    return JSON.parse(localStorage.getItem("PATIENT_INFO") || "null");
  } catch {
    return null;
  }
};

export default function ServiceStep() {
  const { mode } = useParams(); // "bhyt" | "service" | "booking"
  const nav = useNavigate();

  // reset lựa chọn cũ khi vào step-2
  useEffect(() => {
    sessionStorage.removeItem("SELECTED_SERVICE");
  }, []);

  // cờ giảm 50% BHYT
  const [hasBhyt50, setHasBhyt50] = useState(
    String(
      sessionStorage.getItem("HAS_VALID_BHYT") ??
        localStorage.getItem("HAS_VALID_BHYT")
    ) === "1"
  );
  useEffect(() => {
    const read = () =>
      setHasBhyt50(
        String(
          sessionStorage.getItem("HAS_VALID_BHYT") ??
            localStorage.getItem("HAS_VALID_BHYT")
        ) === "1"
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
  const [svcPicked, setSvcPicked] = useState(null); // { maChuyenKhoa, tenChuyenKhoa, ... }
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [doctorNamesAll, setDoctorNamesAll] = useState([]);

  /* doctors */
  const [doctors, setDoctors] = useState([]);
  const [doctorCodesByClinic, setDoctorCodesByClinic] = useState(new Map());
  const [singleDoctorCode, setSingleDoctorCode] = useState(null);

  /* modal lịch */
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickedClinic, setPickedClinic] = useState(null); // { maPhongKham, ... }
  const [monthISO, setMonthISO] = useState(yyyy_mm(now()));
  const [daysData, setDaysData] = useState([]);
  const [datePicked, setDatePicked] = useState("");
  const [shifts, setShifts] = useState([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);

  /* đặt lịch */
  const [placing, setPlacing] = useState(false);

  const patient = useMemo(() => getPatient(), []);

  /* 1) load SPECIALTIES (chỉ dùng mã) */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rs = await client.get("/specialties");
        const items = rs?.data?.items || rs?.data || [];
        const mapped = items.map((x) => ({
          maChuyenKhoa:
            x.maChuyenKhoa ?? x.idChuyenKhoa ?? x.code ?? x.idSpecialty,
          tenChuyenKhoa: x.tenChuyenKhoa ?? x.ten ?? x.name,
          moTa: x.moTa ?? "",
          phiKham: Number(x.phiKham ?? 0),
          thoiGianKhamBinhQuan: Number(x.thoiGianKhamBinhQuan ?? 30),
          soBacSi: Number(x.soBacSi ?? 0),
          phongKham: x.phongKham ?? null,
          raw: x,
        }));
        setList(mapped);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* 2) mở modal phòng */
  const openClinics = async (svc) => {
    setSvcPicked(svc);
    setOpen(true);
    setLoadingClinics(true);
    try {
      // /specialties/:maChuyenKhoa/clinics & /doctors
      const [clinRs, docRs] = await Promise.all([
        client.get(`/specialties/${svc.maChuyenKhoa}/clinics`),
        client.get(`/specialties/${svc.maChuyenKhoa}/doctors`),
      ]);
      const clinicItems = (clinRs?.data?.items || clinRs?.data || []).map(
        norm.clinic
      );
      const doctorItems = (docRs?.data?.items || docRs?.data || []).map(
        norm.doctor
      );

      setDoctors(doctorItems);

      const onlyOneDoctor = doctorItems.length === 1 ? doctorItems[0].maBacSi : null;
      setSingleDoctorCode(onlyOneDoctor);

      const codesMap = new Map();
      const namesMap = new Map();
      const allNames = [];
      doctorItems.forEach((d) => {
        if (!d?.maBacSi) return;
        const key = d.maPhongKham || "__NO_CLINIC__";
        if (!codesMap.has(key)) codesMap.set(key, []);
        codesMap.get(key).push(d.maBacSi);
        allNames.push(d.tenBacSi);
        if (d.maPhongKham) {
          if (!namesMap.has(d.maPhongKham)) namesMap.set(d.maPhongKham, new Set());
          if (d.tenBacSi) namesMap.get(d.maPhongKham).add(d.tenBacSi);
        }
      });
      setDoctorCodesByClinic(codesMap);
      const allDoctorNames = [...new Set(allNames.filter(Boolean))];

      const merged = clinicItems.map((c) => {
        let maBacSi = c.maBacSiChuQuan || onlyOneDoctor;
        const listOfClinic = codesMap.get(c.maPhongKham) || [];
        if (!maBacSi && listOfClinic.length === 1) maBacSi = listOfClinic[0];

        let names = [];
        if (namesMap.has(c.maPhongKham))
          for (const n of namesMap.get(c.maPhongKham)) names.push(n);
        if (!names.length && allDoctorNames.length) names = allDoctorNames.slice(0, 3);

        return {
          ...c,
          maBacSiChuQuan: maBacSi,
          doctorNames: [...new Set(names)],
        };
      });

      setClinics(merged);
      setDoctorNamesAll(allDoctorNames);
    } finally {
      setLoadingClinics(false);
    }
  };

  /* 3) CHỌN PHÒNG */
  const chooseClinic = async (clinic) => {
    if (mode === "booking") {
      setCalendarOpen(true);

      setPickedClinic(clinic);
      setDatePicked("");
      setShifts([]);
      setDaysData([]);
      const month = yyyy_mm(now());
      setMonthISO(month);

      // chọn bác sĩ mặc định (đều là "mã")
      let maBacSi =
        clinic.maBacSiChuQuan ||
        singleDoctorCode ||
        (doctorCodesByClinic.get(clinic.maPhongKham) || [])[0] ||
        doctors[0]?.maBacSi ||
        null;

      setPickedClinic((prev) => ({ ...prev, maBacSiChuQuan: maBacSi }));

      if (!maBacSi) {
        setDaysData([]);
        return;
      }

      try {
        setLoadingDays(true);
        const rs = await client.get(`/doctors/${maBacSi}/schedule-days`, {
          params: { month },
        });
        const rawDays = rs?.data?.items || [];
        // ⚡ Lọc ngày còn hiệu lực (>= hôm nay) và còn slot
        const today = now();
        const todayISO = today.toISOString().slice(0, 10);
        const filteredDays = rawDays.filter((d) => {
          const hasLeft =
            Number(d.soLuongBenhNhanToiDa) - Number(d.soLuongDaDangKy) > 0;
          return hasLeft && String(d.ngayLamViec) >= todayISO;
        });
        setDaysData(filteredDays);
      } finally {
        setLoadingDays(false);
      }
      return;
    }

    // Walk-in (bhyt/service)
    try {
      const maBenhNhan = patient?.maBenhNhan;
      if (!maBenhNhan) return alert("Thiếu thông tin bệnh nhân.");

      const maBacSi =
        clinic.maBacSiChuQuan ||
        singleDoctorCode ||
        (doctorCodesByClinic.get(clinic.maPhongKham) || [])[0] ||
        doctors[0]?.maBacSi ||
        null;

      if (!maBacSi) return alert("Không xác định được bác sĩ.");

      setPlacing(true);

      const loaiKham = mode === "bhyt" ? 1 : 2;
      const payload = {
        maBenhNhan,
        maPhongKham: clinic.maPhongKham,
        maBacSi,
        maChuyenKhoa: svcPicked.maChuyenKhoa,
        loaiKham,
        lyDoKham: `Walk-in ${svcPicked?.tenChuyenKhoa || ""}`,
      };

      const { data } = await client.post("/appointments/walkin", payload);

      // cache service + phòng đã chọn
      const applyHalf = (mode === "bhyt" || mode === "booking") && hasBhyt50;
      const priceInfo = calcPriceHalf(svcPicked.phiKham, applyHalf);
      sessionStorage.setItem(
        "SELECTED_SERVICE",
        JSON.stringify({
          maChuyenKhoa: svcPicked.maChuyenKhoa,
          tenChuyenKhoa: svcPicked.tenChuyenKhoa,
          price: svcPicked.phiKham,
          avgTime: svcPicked.thoiGianKhamBinhQuan,
          priceInfo,
          mode,
          clinic: {
            maPhongKham: clinic.maPhongKham,
            name: clinic.tenPhongKham,
            status: clinic.trangThaiText,
            doctorNames: clinic.doctorNames,
            maBacSi,
          },
        })
      );

      sessionStorage.setItem("APPOINTMENT_RESULT", JSON.stringify(data));
      // ✅ điều hướng với mã
      nav(`/flow/${mode}/step-3?ma=${data.maLichHen}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Đặt lịch trực tiếp thất bại");
    } finally {
      setPlacing(false);
    }
  };

  /* đổi tháng */
  const changeMonth = async (delta) => {
    const [y, m] = monthISO.split("-").map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    const nextISO = yyyy_mm(next);
    setMonthISO(nextISO);

    if (!pickedClinic?.maBacSiChuQuan) return;
    try {
      setLoadingDays(true);
      const rs = await client.get(
        `/doctors/${pickedClinic.maBacSiChuQuan}/schedule-days`,
        { params: { month: nextISO } }
      );
      const rawDays = rs?.data?.items || [];
      const todayISO = now().toISOString().slice(0, 10);
      const filtered = rawDays.filter((d) => {
        const hasLeft =
          Number(d.soLuongBenhNhanToiDa) - Number(d.soLuongDaDangKy) > 0;
        return hasLeft && String(d.ngayLamViec) >= todayISO;
      });
      setDaysData(filtered);
    } finally {
      setLoadingDays(false);
    }
  };

  /* chọn ngày -> nạp ca */
  const pickDate = async (dStr) => {
    if (!pickedClinic?.maBacSiChuQuan) return;
    setDatePicked(dStr);
    try {
      setLoadingShifts(true);
      const rs = await client.get(
        `/doctors/${pickedClinic.maBacSiChuQuan}/schedules`,
        { params: { ngayLamViec: dStr } }
      );
      const rawShifts = rs?.data?.items || [];
      // ⚡ Lọc ca còn hiệu lực: còn slot; nếu hôm nay thì giờ vào phải ở tương lai
      const leftFilter = (sh) =>
        Number(sh.soLuongBenhNhanToiDa) - Number(sh.soLuongDaDangKy) > 0;
      let filtered = rawShifts.filter(leftFilter);

      if (isSameISODate(dStr, now())) {
        const nm = nowMinutes();
        filtered = filtered.filter((sh) => timeToMinutes(sh.gioVao) > nm);
      }

      setShifts(filtered);
    } finally {
      setLoadingShifts(false);
    }
  };

  /* chọn ca -> BOOKING ONLINE */
  const pickShiftAndGo = async (shift) => {
    try {
      const maBenhNhan = patient?.maBenhNhan;
      if (!maBenhNhan) return alert("Thiếu thông tin bệnh nhân.");
      setPlacing(true);

      const loaiKham = mode === "bhyt" ? 1 : 2;
      const maBacSi =
        pickedClinic.maBacSiChuQuan ??
        shift.maBacSi ??
        singleDoctorCode ??
        null;

      const payload = {
        maBenhNhan,
        maBacSi,
        maChuyenKhoa: svcPicked.maChuyenKhoa,
        loaiKham,
        lyDoKham: `Booking ${svcPicked?.tenChuyenKhoa || ""}`,
      };

      // endpoint mới dùng **mã** ca làm việc
      const codeLLV = shift.maLichLamViec;
      const { data } = await client.post(
        `/appointments/booking/${codeLLV}`,
        payload
      );

      const applyHalf = (mode === "bhyt" || mode === "booking") && hasBhyt50;
      const priceInfo = calcPriceHalf(svcPicked.phiKham, applyHalf);
      sessionStorage.setItem(
        "SELECTED_SERVICE",
        JSON.stringify({
          maChuyenKhoa: svcPicked.maChuyenKhoa,
          tenChuyenKhoa: svcPicked.tenChuyenKhoa,
          price: svcPicked.phiKham,
          avgTime: svcPicked.thoiGianKhamBinhQuan,
          priceInfo,
          mode,
          clinic: {
            maPhongKham: pickedClinic.maPhongKham,
            name: pickedClinic.tenPhongKham,
            status: pickedClinic.trangThaiText,
            doctorNames: pickedClinic.doctorNames,
            maBacSi,
          },
          booking: {
            maLichLamViec: shift.maLichLamViec,
            maCaLamViec: shift.maCaLamViec,
            tenCaLamViec: shift.tenCaLamViec,
            ngayLamViec: shift.ngayLamViec,
            gioVao: shift.gioVao,
            gioRa: shift.gioRa,
          },
        })
      );

      sessionStorage.setItem("APPOINTMENT_RESULT", JSON.stringify(data));
      setCalendarOpen(false);
      setOpen(false);
      // ✅ điều hướng với mã
      nav(`/flow/${mode}/step-3?ma=${data.maLichHen}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Đặt lịch online thất bại");
    } finally {
      setPlacing(false);
    }
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
                <div key={svc.maChuyenKhoa} className={s.card}>
                  <div className={s.head}>
                    <div className={s.iconBox}>🩺</div>
                    <div className={s.titleWrap}>
                      <div className={s.title}>{svc.tenChuyenKhoa}</div>
                      {svc.moTa && <div className={s.subtitle}>{svc.moTa}</div>}
                    </div>
                    <div className={s.price}>
                      {showHalf ? (
                        <>
                          <span className={s.oldPrice}>
                            {svc.phiKham.toLocaleString("vi-VN")}đ
                          </span>
                          <span>
                            {Math.round(svc.phiKham * 0.5).toLocaleString("vi-VN")} VND
                          </span>
                          <span className={s.badge}>-50% BHYT</span>
                        </>
                      ) : (
                        <span>{svc.phiKham.toLocaleString("vi-VN")} VND</span>
                      )}
                    </div>
                  </div>

                  <ul className={s.meta}>
                    <li>• Thời gian: ~{svc.thoiGianKhamBinhQuan} phút</li>
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
                {svcPicked && (
                  <div className={s.dSub}>Dịch vụ: {svcPicked.tenChuyenKhoa}</div>
                )}
                {doctorNamesAll?.length > 0 && (
                  <div className={s.dHint}>
                    Bác sĩ chuyên khoa: {doctorNamesAll.join(", ")}
                  </div>
                )}
                {(mode === "bhyt" || mode === "booking") && hasBhyt50 && (
                  <div className={s.badge}>Đang áp dụng -50% BHYT</div>
                )}
              </div>
              <button
                className={s.close}
                onClick={() => setOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className={s.dBody}>
              {loadingClinics ? (
                <div className={s.loading}>Đang tải phòng khám…</div>
              ) : clinics.length === 0 ? (
                <div className={s.empty}>Chưa có phòng khám khả dụng</div>
              ) : (
                <div className={s.clinicGrid}>
                  {clinics.map((c) => (
                    <div key={c.maPhongKham} className={s.clinicCard}>
                      <div className={s.cRow}>
                        <div className={s.cIcon}>📍</div>
                        <div className={s.cName}>{c.tenPhongKham}</div>
                        {c.active && <div className={s.cOk}>✓</div>}
                      </div>
                      <div className={s.cMeta}>
                        {c.doctorNames?.length > 0 && (
                          <div>👤 Bác sĩ: {c.doctorNames.join(", ")}</div>
                        )}
                        <div>⏺ {c.opening ? "Đang hoạt động" : "Tạm ngưng"}</div>
                      </div>
                      <div className={s.hrThin} />
                      <button
                        disabled={placing}
                        className="btn btn-success w-100"
                        onClick={() => chooseClinic(c)}
                      >
                        {mode === "booking"
                          ? "Chọn phòng này"
                          : placing
                          ? "Đang đặt..."
                          : "Chọn phòng này"}
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
                    Dịch vụ: <b>{svcPicked.tenChuyenKhoa}</b> — Phòng:{" "}
                    <b>{pickedClinic.tenPhongKham}</b>
                  </div>
                )}
              </div>
              <button
                className={s.close}
                onClick={() => setCalendarOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className={s.dBody}>
              <div className={s.monthNav}>
                <button className="btn btn-light" onClick={() => changeMonth(-1)}>
                  ◀
                </button>
                <div className={s.monthLabel}>
                  tháng {monthISO.split("-")[1]} {monthISO.split("-")[0]}
                </div>
                <button className="btn btn-light" onClick={() => changeMonth(1)}>
                  ▶
                </button>
              </div>

              <div className={s.calendarGrid}>
                {loadingDays ? (
                  <div className={s.loading}>Đang tải ngày có ca…</div>
                ) : daysData?.length ? (
                  daysData.map((d) => {
                    const left =
                      Number(d.soLuongBenhNhanToiDa) -
                      Number(d.soLuongDaDangKy);
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
                  shifts.map((sh) => {
                    const left =
                      Number(sh.soLuongBenhNhanToiDa) -
                      Number(sh.soLuongDaDangKy);
                    return (
                      <div key={sh.maLichLamViec} className={s.shiftRow}>
                        <div>
                          <div className={s.shiftName}>{sh.tenCaLamViec}</div>
                          <div className={s.shiftTime}>
                            {sh.gioVao} - {sh.gioRa}
                          </div>
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
