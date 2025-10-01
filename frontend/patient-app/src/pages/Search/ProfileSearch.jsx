import { useEffect, useMemo, useRef, useState } from "react";
import client from "../../api/client";
import s from "./ProfileSearch.module.css";

/* ===== helpers ===== */
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const pad = (n) => String(n).padStart(2, "0");
const cx = (...names) => names.filter(Boolean).map((n) => s[n] || n).join(" ");

function fmtMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString("vi-VN") + " đ";
}
function fmtDate(d) {
  if (!isIsoDate(d)) return "--/--/----";
  const [y, m, dd] = d.split("-");
  return `${pad(dd)}-${pad(m)}-${y}`;
}
function statusText(sv) {
  const n = Number(sv);
  if (n === -1) return { text: "Đã hủy", cls: "st-cancel" };
  if (n === 5) return { text: "Hoàn tất", cls: "st-done" };
  if (n === 3) return { text: "Đang khám", cls: "st-processing" };
  if (n === 2) return { text: "Đã xác nhận", cls: "st-confirmed" };
  return { text: "Đã đặt", cls: "st-created" }; // 1
}

export default function ProfileSearch() {
  /* ==== patient info ==== */
  const patient = useMemo(() => {
    try {
      const raw =
        sessionStorage.getItem("PATIENT_INFO") ||
        localStorage.getItem("PATIENT_INFO");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const idBenhNhan = patient?.idBenhNhan;

  /* ==== filters ==== */
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL|ACTIVE|CANCELED|number
  const [keyword, setKeyword] = useState("");

  /* ==== data states ==== */
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState([]);
  const [error, setError] = useState("");

  const abortRef = useRef(null);

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idBenhNhan]);

  async function load() {
    if (!idBenhNhan) {
      setError("Thiếu thông tin bệnh nhân. Vui lòng đăng nhập lại.");
      setRaw([]);
      setLoading(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      q.set("idBenhNhan", String(idBenhNhan)); // cần cho patientSelfOrStaff
      // nếu BE đã hỗ trợ các filter này thì sẽ áp dụng; nếu chưa, FE vẫn lọc client-side
      if (isIsoDate(from)) q.set("from", from);
      if (isIsoDate(to)) q.set("to", to);
      if (status && status !== "ALL") q.set("status", status);

      const { data } = await client.get(`/appointments/my?${q.toString()}`, {
        signal: abortRef.current.signal,
      });
      setRaw(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      if (e.name === "CanceledError" || e.name === "AbortError") return;
      setRaw([]);
      setError(e?.response?.data?.message || e?.message || "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  /* ==== client-side filter (an toàn nếu BE chưa hỗ trợ) ==== */
  const items = useMemo(() => {
    let arr = [...raw];

    if (isIsoDate(from)) arr = arr.filter((x) => String(x.ngayHen) >= from);
    if (isIsoDate(to)) arr = arr.filter((x) => String(x.ngayHen) <= to);

    const sTxt = String(status).toUpperCase();
    if (sTxt === "ACTIVE") arr = arr.filter((x) => Number(x.trangThai) !== -1);
    else if (sTxt === "CANCELED") arr = arr.filter((x) => Number(x.trangThai) === -1);
    else if (/^-?\d+$/.test(sTxt)) arr = arr.filter((x) => Number(x.trangThai) === Number(sTxt));

    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      arr = arr.filter(
        (x) =>
          (x.tenBacSi || "").toLowerCase().includes(k) ||
          (x.tenChuyenKhoa || "").toLowerCase().includes(k) ||
          (x.tenPhongKham || "").toLowerCase().includes(k)
      );
    }

    arr.sort((a, b) => {
      const ka = `${a.ngayHen ?? ""} ${a.gioHen ?? ""}`;
      const kb = `${b.ngayHen ?? ""} ${b.gioHen ?? ""}`;
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
    return arr;
  }, [raw, from, to, status, keyword]);

  /* ==== actions ==== */
  async function cancelAppt(appt) {
    if (Number(appt.trangThai) === -1) return;
    const ok = window.confirm(
      `Hủy lịch này?\nBác sĩ: ${appt.tenBacSi}\nThời gian: ${(appt.gioHen || "").slice(
        0,
        5
      )} ${fmtDate(appt.ngayHen)}`
    );
    if (!ok) return;

    try {
      await client.put(`/appointments/${appt.idLichHen}/cancel`, { idBenhNhan });
      // update lạc quan
      setRaw((prev) =>
        prev.map((x) =>
          x.idLichHen === appt.idLichHen
            ? { ...x, trangThai: -1, lyDoKham: `${x.lyDoKham || ""} | cancel by patient` }
            : x
        )
      );
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Hủy lịch thất bại");
    }
  }

  /* ==== UI ==== */
  return (
    <div className={s.apts}>
      <div className={s["apts-header"]}>
        <div className={s["apts-title"]}>
          <span className={s.ico}>🩺</span> Danh Sách Lịch Hẹn
        </div>

        <div className={s.filters}>
          <div className={s.fcol}>
            <label>Từ ngày</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className={s.fcol}>
            <label>Đến ngày</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className={s.fcol}>
            <label>Trạng thái lịch hẹn</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Còn hiệu lực</option>
              <option value="CANCELED">Đã hủy</option>
              <option value="1">Đã đặt</option>
              <option value="2">Đã xác nhận</option>
              <option value="3">Đang khám</option>
              <option value="5">Hoàn tất</option>
            </select>
          </div>
          <div className={cx("fcol", "grow")}>
            <label>Tìm nhanh</label>
            <input
              placeholder="Tên bác sĩ / chuyên khoa / phòng"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className={s.fcol}>
            <label>&nbsp;</label>
            <div className={s.btns}>
              <button className={cx("btn", "btn-primary")} onClick={load} disabled={loading}>
                {loading ? "Đang tải…" : "Làm mới"}
              </button>
              <button
                className={cx("btn")}
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setStatus("ALL");
                  setKeyword("");
                }}
              >
                Xóa lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className={cx("alert", "error")}>{error}</div>}
      {!error && loading && <div className={cx("alert", "info")}>Đang tải dữ liệu…</div>}
      {!loading && !items.length && !error && (
        <div className={cx("alert", "empty")}>Không có lịch nào phù hợp bộ lọc.</div>
      )}

      <div className={s.cards}>
        {items.map((it) => {
          const fee = it.phiDaGiam ?? it.phiKhamGoc;
          const st = statusText(it.trangThai);
          return (
            <div key={it.idLichHen} className={s.card}>
              <div className={s["card-head"]}>
                <div className={s.svc}>
                  <span className={s.lbl}>Chuyên Khoa:</span>{" "}
                  <b>{it.tenChuyenKhoa || "—"}</b>
                </div>
                <div className={cx("status", st.cls)}>{st.text}</div>
              </div>

              <div className={s.grid}>
                <div className={s.row}>
                  <span className={s.lbl}>Phòng:</span>
                  <span className={s.val}>{it.tenPhongKham || "—"}</span>
                </div>
                <div className={s.row}>
                  <span className={s.lbl}>Bác sĩ:</span>
                  <span className={s.val}>{it.tenBacSi || "—"}</span>
                </div>
                <div className={s.row}>
                  <span className={s.lbl}>Số thứ tự:</span>
                  <span className={cx("val", "hi")}>{it.sttKham || "-"}</span>
                </div>
                <div className={s.row}>
                  <span className={s.lbl}>Giá:</span>
                  <span className={cx("val", "hi")}>{fmtMoney(fee)}</span>
                </div>
                <div className={s.row}>
                  <span className={s.lbl}>Thời gian:</span>
                  <span className={s.val}>
                    {(it.gioHen || "").slice(0, 5)} {fmtDate(it.ngayHen)}
                  </span>
                </div>
                <div className={s.row}>
                  <span className={s.lbl}>Trạng thái:</span>
                  <span className={cx("val", st.cls)}>{st.text}</span>
                </div>
              </div>

              <div className={s["card-actions"]}>
                {Number(it.trangThai) !== -1 ? (
                  <button className={cx("btn", "danger")} onClick={() => cancelAppt(it)}>
                    Hủy lịch
                  </button>
                ) : (
                  <span className={s.muted}>Lịch đã hủy</span>
                )}
                <span className={s.code}>Mã lịch: #{it.idLichHen}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
