// frontend/admin-doctor-app/src/pages/doctor/DoctorHome.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";
import Chart from "react-apexcharts";

/* ===== helpers ===== */
const todayYMD = () => new Date().toISOString().slice(0, 10);
const monthStartYMD = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const weekStartYMD = () => {
  const d = new Date();
  const day = d.getDay() || 7; // CN=7
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
};
function getMe() {
  try { return JSON.parse(localStorage.getItem("ME") || "null"); }
  catch { return null; }
}

export default function DoctorHome() {
  /* ====== filters ====== */
  const [from, setFrom] = useState(todayYMD());
  const [to, setTo] = useState(todayYMD());

  /* ====== doctor code from local ====== */
  const me = useMemo(() => getMe() || {}, []);
  const maBacSi = useMemo(() => (me?.maBacSi ? String(me.maBacSi) : ""), [me]);

  /* ====== state ====== */
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(maBacSi ? "" : "Không xác định được mã bác sĩ");

  const [sum, setSum] = useState({
    range: { from: "", to: "" },
    registered: 0,
    inProgress: 0,
    done: 0,
    noShow: 0,
    cancelled: 0,
  });

  /* guards hủy request cũ khi filter đổi */
  const runId = useRef(0);
  const abortRef = useRef(null);

  async function load() {
    if (!maBacSi) return; // không có mã -> không gọi API

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++runId.current;

    setLoading(true);
    setAlertMsg("");

    try {
      const { data } = await client.get("/doctor/appointments/stats", {
        params: { from, to, maBacSi },
        signal: controller.signal,
      });
      
      setSum({
        range: data?.range || { from, to },
        registered: Number(data?.registered || 0),
        inProgress: Number(data?.inProgress || 0),
        done: Number(data?.done || 0),
        noShow: Number(data?.noShow || 0),
        cancelled: Number(data?.cancelled || 0),
      });

      if (id !== runId.current) return;

      setSum({
        range: data?.range || { from, to },
        registered: Number(data?.registered || 0),
        inProgress: Number(data?.inProgress || 0),
        done: Number(data?.done || 0),
        noShow: Number(data?.noShow || 0),
        cancelled: Number(data?.cancelled || 0),
      });
    } catch (e) {
      if (e?.name === "CanceledError" || e?.name === "AbortError") return;
      if (id !== runId.current) return;
      setAlertMsg(e?.response?.data?.message || "Không tải được dữ liệu.");
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!maBacSi) return; // thiếu mã -> chỉ hiển thị cảnh báo
    if (from && to && from > to) return;
    load();
    return () => {
      runId.current++;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [from, to, maBacSi]);

  /* ====== charts ====== */
  const donutSeries = useMemo(
    () => [
      sum.inProgress || 0,
      sum.registered || 0,
      sum.done || 0,
      sum.noShow || 0,
      sum.cancelled || 0,
    ],
    [sum]
  );
  const donutOptions = useMemo(
    () => ({
      chart: { type: "donut", toolbar: { show: false } },
      labels: ["Đã đăng ký", "Đang khám", "Đã khám", "Không đến", "Hủy lịch"],
      dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
      legend: { position: "bottom" },
      tooltip: { y: { formatter: (v) => `${v} ca` } },
      stroke: { width: 1 },
    }),
    []
  );

  const barSeries = useMemo(
    () => [
      {
        name: "Số ca",
        data: [
          sum.inProgress || 0,
          sum.registered || 0,
          sum.done || 0,
          sum.noShow || 0,
          sum.cancelled || 0,
        ],
      },
    ],
    [sum]
  );
  const barOptions = useMemo(
    () => ({
      chart: { type: "bar", toolbar: { show: false } },
      xaxis: { categories: ["Đã đăng kí", "Đang khám", "Đã khám", "Không đến", "Hủy lịch"] },
      plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v) => `${v} ca` } },
      yaxis: { forceNiceScale: true },
    }),
    []
  );

  /* presets */
  const setToday = () => { const t = todayYMD(); setFrom(t); setTo(t); };
  const setThisWeek = () => { setFrom(weekStartYMD()); setTo(todayYMD()); };
  const setThisMonth = () => { setFrom(monthStartYMD()); setTo(todayYMD()); };

  return (
    <Layout>
      <div className="card page-flex vh-card">
        <div className="card-body page-flex">
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Bảng điều khiển bác sĩ</h2>
          </div>

          {alertMsg && (
            <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
              {alertMsg}
              <button type="button" className="btn-close" onClick={() => setAlertMsg("")} />
            </div>
          )}

          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <label className="form-label small">Từ ngày</label>
              <input
                type="date"
                className="form-control"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to || undefined}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Đến ngày</label>
              <input
                type="date"
                className="form-control"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from || undefined}
                max={todayYMD()}
              />
            </div>
            <div className="col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-outline-secondary" onClick={setToday} type="button">Hôm nay</button>
              <button className="btn btn-outline-secondary" onClick={setThisWeek} type="button">Tuần này</button>
              <button className="btn btn-outline-secondary" onClick={setThisMonth} type="button">Tháng này</button>
              {loading && <span className="spinner-border spinner-border-sm ms-auto" />}
            </div>
          </div>

          <div className="row g-3 mb-3">
            {[
              { k: "inProgress", w: 2, label: "Đã đăng ký" },
              { k: "registered", w: 2, label: "Đang khám" },
              { k: "done", w: 2, label: "Đã khám" },
              { k: "noShow", w: 3, label: "Không đến" },
              { k: "cancelled", w: 3, label: "Hủy lịch" },
            ].map((x) => (
              <div className={`col-md-${x.w}`} key={x.k}>
                <div className="p-3 border rounded-3 h-100">
                  <div className="text-muted small">{x.label}</div>
                  <div className="fs-4 fw-bold">{sum[x.k]}</div>
                  <div className="text-muted small">({sum.range.from} → {sum.range.to})</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="scroll-zone">
            <div className="row g-3">
              <div className="col-lg-6">
                <div className="p-3 border rounded-3 h-100">
                  <div className="d-flex align-items-center mb-2">
                    <h5 className="m-0">Cơ cấu lịch hẹn</h5>
                    {loading && <span className="spinner-border spinner-border-sm ms-2" />}
                  </div>
                  <Chart options={donutOptions} series={donutSeries} type="donut" height={320} />
                </div>
              </div>

              <div className="col-lg-6">
                <div className="p-3 border rounded-3 h-100">
                  <div className="d-flex align-items-center mb-2">
                    <h5 className="m-0">Số lịch theo trạng thái</h5>
                    {loading && <span className="spinner-border spinner-border-sm ms-2" />}
                  </div>
                  <Chart options={barOptions} series={barSeries} type="bar" height={320} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
