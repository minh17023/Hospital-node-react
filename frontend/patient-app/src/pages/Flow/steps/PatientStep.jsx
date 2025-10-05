import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../../api/client";
import Stepper from "../../../components/Stepper/Stepper";
import s from "./StepPatient.module.css";

// yyyy-MM-dd từ ISO/string
function fmtDate(iso) {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
const sexText = (v) =>
  v === "M" || v === "Nam" || v === 1 ? "Nam" :
  v === "F" || v === "Nữ" || v === 0 ? "Nữ" : "-";

const maritalText = (v) => {
  if (v == null || v === "") return "-";
  const t = String(v).toLowerCase();
  if (["độc thân","doc than","single","0","chua ket hon"].includes(t)) return "Độc thân";
  if (["đã kết hôn","da ket hon","married","1"].includes(t)) return "Đã kết hôn";
  if (["ly hôn","divorced","2"].includes(t)) return "Ly hôn";
  if (["góa","widowed","3"].includes(t)) return "Góa";
  return String(v);
};

// bắt 1 thẻ BHYT từ payload linh hoạt
const extractSingleBhyt = (payload) => {
  const b = payload?.bhyt;
  if (!b) return null;
  if (Array.isArray(b)) return b[0] || null;
  if (b?.items && Array.isArray(b.items)) return b.items[0] || null;
  if (b?.t && typeof b.t === "object") return b.t;
  if (typeof b === "object") return b;
  return null;
};
const isValidBhyt = (c) =>
  c?.trangThai === 1 &&
  String(c?.denNgay).slice(0, 10) >= new Date().toISOString().slice(0, 10);

export default function PatientStep() {
  const nav = useNavigate();
  const { mode } = useParams(); // bhyt | service | booking

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [card, setCard] = useState(null);

  // fetch hồ sơ + thẻ
  useEffect(() => {
    const cachedRaw = localStorage.getItem("PATIENT_INFO");
    if (!cachedRaw) { nav("/"); return; }
    const cached = JSON.parse(cachedRaw);
    setPatient(cached);

    (async () => {
      try {
        setLoading(true);
        // hồ sơ (API mới)
        const me = await client.get("/auth/patient/me").catch(() => null);
        const fresh = me?.data?.patient || cached;
        setPatient(fresh);
        localStorage.setItem("PATIENT_INFO", JSON.stringify(fresh));

        // thẻ BHYT (API mới dùng maBenhNhan)
        if (fresh?.maBenhNhan) {
          const bh = await client.get(`/patients/${fresh.maBenhNhan}/bhyt`).catch(() => null);
          const the = extractSingleBhyt(bh?.data) || null;
          setCard(the);

          // set cờ HAS_VALID_BHYT để Menu kiểm soát vào luồng BHYT
          sessionStorage.setItem("HAS_VALID_BHYT", isValidBhyt(the) ? "1" : "0");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  // sang bước 2 của đúng mode hiện tại
  const next = () => nav(`/flow/${mode}/step-2`);

  if (!patient) return null;

  const rows = [
    ["Số CCCD", patient.soCCCD || patient.cccd || "-"],
    ["Họ và tên", patient.hoTen || "-"],
    ["Ngày sinh", fmtDate(patient.ngaySinh) || "-"],
    ["Giới tính", sexText(patient.gioiTinh)],
    ["Số điện thoại", patient.soDienThoai || "-"],
    ["Email", patient.email || "-"],
    ["Địa chỉ", patient.diaChi || "-"],
    ["Nghề nghiệp", patient.ngheNghiep || "-"],
    ["Tình trạng hôn nhân", maritalText(patient.tinhTrangHonNhan)],
    [
      "Thẻ BHYT",
      card
        ? `${card.soThe}  —  Hết hạn: ${String(card.denNgay || "").slice(0,10)}`
        : "Chưa có thẻ BHYT",
      card ? (isValidBhyt(card) ? "valid" : "invalid") : "none",
    ],
  ];

  return (
    <div className="container py-4">
      <div className={s.stickyStepper}>
        <Stepper step={1} />
      </div>

      <div className={`${s.card} card p-4 mx-auto`} style={{ maxWidth: 1040 }}>
        <div className="text-center mb-3">
          <h2 className={s.title}>Hồ Sơ Bệnh Nhân</h2>
          <div className={s.sub}>Vui lòng kiểm tra thông tin trước khi tiếp tục</div>
        </div>

        {loading && (
          <div className="mb-3">
            <div className={s.skelRow} />
            <div className={s.skelRow} />
            <div className={s.skelRow} />
          </div>
        )}

        <div className={s.grid}>
          {rows.map(([label, value, badge]) => (
            <div className={s.item} key={label}>
              <div className={s.label}>{label}</div>
              <div className={s.value}>
                {value || "-"}
                {badge === "valid" && <span className={`${s.badge} ${s.ok}`}>Hợp lệ</span>}
                {badge === "invalid" && <span className={`${s.badge} ${s.bad}`}>Hết/khóa</span>}
                {badge === "none" && <span className={`${s.badge} ${s.muted}`}>Chưa có</span>}
              </div>
            </div>
          ))}
        </div>

        <div className={s.actions}>
          <button className="btn btn-primary px-4" onClick={next}>
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
