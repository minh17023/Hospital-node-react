// src/pages/FlowBhyt/ServiceStep.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../../api/client";
import Stepper from "../../../components/Stepper/Stepper";
import s from "./ServiceStep.module.css";

/* ===== helpers ===== */
function calcPrice(mode, basePrice, opts = {}) {
  if (mode === "bhyt") {
    const coverage = opts.coverage ?? 1; // 1 = 100%
    const copay = opts.copay ?? 0;
    const bhytPay = Math.round(basePrice * coverage);
    const total = Math.max(0, basePrice - bhytPay + copay);
    return { total, note: `BHYT chi trả ${coverage * 100}%` };
  }
  if (mode === "booking") {
    const deposit = opts.deposit ?? 0;
    return { total: basePrice, deposit, note: deposit ? `Cọc ${deposit.toLocaleString("vi-VN")}đ` : "" };
  }
  return { total: basePrice, note: "" };
}

/* Chuẩn hoá dữ liệu trả về từ nhiều backend field-name khác nhau */
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
    name: d?.hoTen ?? d?.tenDayDu ?? d?.fullName ?? d?.ten ?? d?.name ?? d?.doctorName ?? "",
    clinicId: d?.idPhongKham ?? d?.clinicId ?? d?.phongKhamId ?? null,
    active: d?.trangThai === 1 || /active|đang hoạt động|dang hoat dong/i.test(String(d?.trangThaiText || d?.status || "")),
    opening: d?.dangHoatDong ?? d?.opening ?? true,
    raw: d,
  }),
};

export default function ServiceStep() {
  const { mode } = useParams();        // "bhyt" | "service" | "booking"
  const nav = useNavigate();

  /* ===== state: specialties ===== */
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===== state: modal chọn phòng ===== */
  const [open, setOpen] = useState(false);
  const [svcPicked, setSvcPicked] = useState(null);
  const [clinics, setClinics] = useState([]);      // mảng phòng đã ghép tên bác sĩ
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [doctorNamesAll, setDoctorNamesAll] = useState([]); // fallback danh sách bác sĩ của chuyên khoa

  /* bệnh nhân (để tính giá) */
  const patient = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("PATIENT_INFO") || "null"); }
    catch { return null; }
  }, []);

  /* ===== 1) load SPECIALTIES khi vào trang ===== */
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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===== 2) mở modal -> gọi 2 API theo chuyên khoa (clinics + doctors) ===== */
  const openClinics = async (svc) => {
    setSvcPicked(svc);
    setOpen(true);
    setLoadingClinics(true);
    try {
      // gọi song song 2 API
      const [clinRs, docRs] = await Promise.all([
        client.get(`/specialties/${svc.id}/clinics`),
        client.get(`/specialties/${svc.id}/doctors`),
      ]);

      // chuẩn hoá dữ liệu
      const clinicItems = (clinRs?.data?.items || clinRs?.data || []).map(norm.clinic);
      const doctorItems = (docRs?.data?.items || docRs?.data || []).map(norm.doctor);

      // build map tiện tra cứu
      const doctorById = new Map();
      const doctorNamesByClinic = new Map(); // clinicId -> Set(names)
      doctorItems.forEach(d => {
        if (d.id) doctorById.set(d.id, d);
        if (d.clinicId) {
          if (!doctorNamesByClinic.has(d.clinicId)) doctorNamesByClinic.set(d.clinicId, new Set());
          if (d.name) doctorNamesByClinic.get(d.clinicId).add(d.name);
        }
      });

      // Fallback: danh sách bác sĩ toàn chuyên khoa (khi không gắn phòng)
      const allDoctorNames = [...new Set(doctorItems.map(d => d.name).filter(Boolean))];

      // ghép tên bác sĩ vào từng phòng:
      const merged = clinicItems.map(c => {
        let names = [];
        // 1) nếu phòng có idBacSi -> ưu tiên lấy theo id
        if (c.idBacSi && doctorById.has(c.idBacSi)) {
          const { name } = doctorById.get(c.idBacSi);
          if (name) names.push(name);
        }
        // 2) ghép thêm theo clinicId (nhiều bác sĩ cùng phòng)
        if (doctorNamesByClinic.has(c.id)) {
          for (const n of doctorNamesByClinic.get(c.id)) names.push(n);
        }
        // 3) fallback: chưa có tên nào -> lấy top 3 bác sĩ của chuyên khoa
        if (names.length === 0 && allDoctorNames.length) {
          names = allDoctorNames.slice(0, 3);
        }
        // xoá trùng
        names = [...new Set(names)];
        return { ...c, doctorNames: names };
      });

      setClinics(merged);
      setDoctorNamesAll(allDoctorNames);
    } finally {
      setLoadingClinics(false);
    }
  };

  /* ===== 3) chọn phòng -> lưu & next ===== */
  const chooseClinic = (clinic) => {
    const coverage = patient?.bhytCoverage ?? 1;
    const priceInfo = calcPrice(mode, svcPicked.price, { coverage });

    sessionStorage.setItem("SELECTED_SERVICE", JSON.stringify({
      id: svcPicked.id,
      name: svcPicked.name,
      price: svcPicked.price,
      avgTime: svcPicked.avgTime,
      priceInfo,
      mode,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        status: clinic.statusText,
        doctorNames: clinic.doctorNames,       // mảng tên bác sĩ (có thể nhiều)
        idBacSi: clinic.idBacSi ?? null,
      },
    }));

    nav(`/flow/${mode}/step-3`);
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
            {list.map((svc) => (
              <div key={svc.id} className={s.card}>
                <div className={s.head}>
                  <div className={s.iconBox}>🩺</div>
                  <div className={s.titleWrap}>
                    <div className={s.title}>{svc.name}</div>
                    {svc.desc && <div className={s.subtitle}>{svc.desc}</div>}
                  </div>
                  <div className={s.price}>
                    {svc.price.toLocaleString("vi-VN")} VND
                  </div>
                </div>

                <ul className={s.meta}>
                  <li>• Thời gian: ~{svc.avgTime} phút</li>
                  {svc.soBacSi != null && <li>• Số bác sĩ: {svc.soBacSi}</li>}
                  {svc.phongKham && <li>• Phòng khám: {svc.phongKham}</li>}
                </ul>

                <div className={s.hr} />
                <button className="btn btn-primary w-100" onClick={() => openClinics(svc)}>
                  Chọn dịch vụ này
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal chọn phòng khám */}
      {open && (
        <div className={s.modal} role="dialog" aria-modal="true">
          <div className={s.backdrop} onClick={() => setOpen(false)} />
          <div className={s.dialog} role="document">
            <div className={s.dHead}>
              <div>
                <div className={s.dTitle}>Chọn Phòng Khám</div>
                {svcPicked && <div className={s.dSub}>Dịch vụ: {svcPicked.name}</div>}
                {/* Fallback: show list BS của chuyên khoa ở đầu modal */}
                {doctorNamesAll?.length > 0 && (
                  <div className={s.dHint}>
                    Bác sĩ chuyên khoa: {doctorNamesAll.join(", ")}
                  </div>
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
                        {c.doctorNames?.length > 0 && (
                          <div>👤 Bác sĩ: {c.doctorNames.join(", ")}</div>
                        )}
                        <div>⏺ {c.opening ? "Đang hoạt động" : "Tạm ngưng"}</div>
                      </div>
                      <div className={s.hrThin} />
                      <button className="btn btn-success w-100" onClick={() => chooseClinic(c)}>
                        Chọn phòng này
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
