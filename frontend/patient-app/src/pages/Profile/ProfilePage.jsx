import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import s from "./ProfilePage.module.css";

const getPatient = () => {
  const raw =
    localStorage.getItem("PATIENT_INFO") ||
    sessionStorage.getItem("PATIENT_INFO");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

const isValidBhyt = (c) =>
  c?.trangThai === 1 &&
  String(c.denNgay).slice(0, 10) >= new Date().toISOString().slice(0, 10);

// Kỳ vọng { bhyt: null | {...} } – nhưng vẫn chịu vài shape khác
const extractSingleBhyt = (payload) => {
  const b = payload?.bhyt;
  if (!b) return null;
  if (Array.isArray(b)) return b[0] || null;
  if (b?.items && Array.isArray(b.items)) return b.items[0] || null;
  if (b?.t && typeof b.t === "object") return b.t;
  if (typeof b === "object") return b;
  return null;
};

export default function ProfilePage() {
  const readHash = () =>
    (typeof window !== "undefined" && window.location.hash === "#bhyt")
      ? "bhyt"
      : "profile";

  const [tab, setTab] = useState(readHash);
  const [patient, setPatient] = useState(getPatient());
  const [saving, setSaving] = useState(false);

  // ====== BHYT (1–1) ======
  const [card, setCard] = useState(null);
  const [form, setForm] = useState({ soThe: "", denNgay: "" });
  const [loadingBHYT, setLoadingBHYT] = useState(false);

  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const loadBhyt = async (idBenhNhan) => {
    setLoadingBHYT(true);
    try {
      const { data } = await client.get(`/patients/${idBenhNhan}/bhyt`);
      const c = extractSingleBhyt(data);
      setCard(c || null);
      setForm({
        soThe: c?.soThe || "",
        denNgay: String(c?.denNgay || "").slice(0, 10),
      });

      const ok = !!c && isValidBhyt(c);
      localStorage.setItem("HAS_VALID_BHYT", ok ? "1" : "0");
      if (ok) localStorage.setItem("CURRENT_BHYT", JSON.stringify(c));
      else localStorage.removeItem("CURRENT_BHYT");
    } catch {
      setCard(null);
      setForm({ soThe: "", denNgay: "" });
      localStorage.setItem("HAS_VALID_BHYT", "0");
      localStorage.removeItem("CURRENT_BHYT");
    } finally {
      setLoadingBHYT(false);
    }
  };

  useEffect(() => {
    if (patient?.idBenhNhan) loadBhyt(patient.idBenhNhan);
  }, [patient?.idBenhNhan]);

  // ---------- PROFILE ----------
  const P = patient || {};
  const setP = (k) => (e) =>
    setPatient((prev) => ({ ...prev, [k]: e.target.value }));

  const saveProfile = async () => {
    if (!patient?.idBenhNhan) return;
    setSaving(true);
    try {
      await client.put(`/patients/${patient.idBenhNhan}`, {
        hoTen: P.hoTen, ngaySinh: P.ngaySinh, gioiTinh: P.gioiTinh,
        soDienThoai: P.soDienThoai, email: P.email, diaChi: P.diaChi,
        ngheNghiep: P.ngheNghiep, tinhTrangHonNhan: P.tinhTrangHonNhan,
        nguoiLienHe: P.nguoiLienHe, sdtLienHe: P.sdtLienHe,
      });
      localStorage.setItem("PATIENT_INFO", JSON.stringify({
        ...patient,
        hoTen: P.hoTen, ngaySinh: P.ngaySinh, gioiTinh: P.gioiTinh,
        soDienThoai: P.soDienThoai, email: P.email, diaChi: P.diaChi,
        ngheNghiep: P.ngheNghiep, tinhTrangHonNhan: P.tinhTrangHonNhan,
        nguoiLienHe: P.nguoiLienHe, sdtLienHe: P.sdtLienHe,
      }));
      alert("Đã lưu hồ sơ.");
    } catch (e) {
      alert(e?.response?.data?.message || "Không thể lưu hồ sơ");
    } finally { setSaving(false); }
  };

  // ---------- BHYT ----------
  const setField = (k) => (e) => setForm((s0) => ({ ...s0, [k]: e.target.value }));

  const submitBhyt = async () => {
    if (!patient?.idBenhNhan) return;
    if (!form.soThe || !form.denNgay) return alert("Nhập số thẻ & ngày hết hạn");

    try {
      if (card) {
        await client.put(`/patients/${patient.idBenhNhan}/bhyt`, {
          soThe: form.soThe, denNgay: form.denNgay,
        });
      } else {
        await client.post(`/patients/${patient.idBenhNhan}/bhyt`, {
          soThe: form.soThe, denNgay: form.denNgay, trangThai: 1,
        });
      }
      await loadBhyt(patient.idBenhNhan);
      alert(card ? "Đã cập nhật BHYT." : "Đã thêm BHYT.");
    } catch (e) {
      alert(e?.response?.data?.message || "Không thể cập nhật BHYT");
    }
  };

  const gotoTab = (name) => {
    if (typeof window !== "undefined") {
      window.location.hash = name === "bhyt" ? "#bhyt" : "";
    }
    setTab(name);
  };

  return (
    <div className={s.page}>
      <div className={s.tabs}>
        <button
          className={`${s.tab} ${tab === "profile" ? s.active : ""}`}
          onClick={() => gotoTab("profile")}
        >Hồ sơ</button>
        <button
          className={`${s.tab} ${tab === "bhyt" ? s.active : ""}`}
          onClick={() => gotoTab("bhyt")}
        >BHYT</button>
      </div>

      {/* PROFILE */}
      {tab === "profile" && patient && (
        <div className={`card ${s.cardCompact}`}>
          <div className={s.formGrid}>
            <div className={s.field}>
              <label className={s.label}>Số CCCD</label>
              <input className={`form-control ${s.control}`} value={P.soCCCD || ""} disabled />
            </div>

            <div className={s.field}>
              <label className={s.label}>Họ và tên</label>
              <input className={`form-control ${s.control}`}
                     value={P.hoTen || ""} onChange={setP("hoTen")} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Ngày sinh</label>
              <input type="date" className={`form-control ${s.control}`}
                     value={String(P.ngaySinh || "").slice(0, 10)}
                     onChange={setP("ngaySinh")} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Giới tính</label>
              <select className={`form-select ${s.control}`}
                      value={P.gioiTinh || ""} onChange={setP("gioiTinh")}>
                <option value="">--</option>
                <option value="M">Nam</option>
                <option value="F">Nữ</option>
              </select>
            </div>

            <div className={s.field}>
              <label className={s.label}>Số điện thoại</label>
              <input className={`form-control ${s.control}`}
                     value={P.soDienThoai || ""} onChange={setP("soDienThoai")} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Email</label>
              <input className={`form-control ${s.control}`}
                     value={P.email || ""} onChange={setP("email")} />
            </div>

            <div className={`${s.field} ${s.colSpan2}`}>
              <label className={s.label}>Địa chỉ</label>
              <input className={`form-control ${s.control}`}
                     value={P.diaChi || ""} onChange={setP("diaChi")} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Nghề nghiệp</label>
              <input className={`form-control ${s.control}`}
                     value={P.ngheNghiep || ""} onChange={setP("ngheNghiep")} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Tình trạng hôn nhân</label>
              <input className={`form-control ${s.control}`}
                     value={P.tinhTrangHonNhan || ""} onChange={setP("tinhTrangHonNhan")} />
            </div>
          </div>

          <div className={s.actions}>
            <button className="btn btn-primary" disabled={saving} onClick={saveProfile}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      )}

      {/* BHYT */}
      {tab === "bhyt" && (
        <>
          <div className={`card ${s.cardCompact}`}>
            <h5 className="mb-2">Thẻ BHYT hiện có</h5>
            {loadingBHYT ? (
              <div className="text-muted">Đang tải...</div>
            ) : card ? (
              <div className={s.bhytHeader}>
                <div><b>Số thẻ:</b> {card.soThe}</div>
                <div><b>Hết hạn:</b> {String(card.denNgay).slice(0, 10)}</div>
                <span className={`badge ${isValidBhyt(card) ? "bg-success" : "bg-secondary"}`}>
                  {isValidBhyt(card) ? "Hợp lệ" : "Hết/khóa"}
                </span>
              </div>
            ) : (
              <div className="text-muted">Chưa có thẻ. Thêm ở bên dưới.</div>
            )}
          </div>

          <div className={`card ${s.cardCompact}`}>
            <h5 className="mb-2">{card ? "Sửa thẻ BHYT" : "Thêm thẻ BHYT"}</h5>
            <div className={s.formGrid}>
              <div className={`${s.field} ${s.colSpan2}`}>
                <label className={s.label}>Số thẻ *</label>
                <input className={`form-control ${s.control}`}
                       value={form.soThe} onChange={setField("soThe")} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Ngày hết hạn *</label>
                <input type="date" className={`form-control ${s.control}`}
                       value={form.denNgay} onChange={setField("denNgay")} />
              </div>
            </div>
            <div className={s.actions}>
              <button className="btn btn-primary" onClick={submitBhyt}>
                {card ? "Lưu thay đổi" : "Thêm thẻ"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
