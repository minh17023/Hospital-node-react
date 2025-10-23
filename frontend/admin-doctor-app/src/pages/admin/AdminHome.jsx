import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";
import Chart from "react-apexcharts";

/* ===== helpers ===== */
const fmtMoney = (n) =>
  Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(n || 0));
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

export default function AdminHome() {
  /* filters */
  const [from, setFrom] = useState(monthStartYMD());
  const [to, setTo] = useState(todayYMD());

  /* data */
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [sum, setSum] = useState({
    range: { from: "", to: "" },
    revenuePaid: 0,
    revenueUnpaid: 0,
    orders: { total: 0, paid: 0, unpaid: 0, avgPaidOrderValue: 0 },
  });

  /* guards */
  const runId = useRef(0);
  const abortRef = useRef(null);

  async function load() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const id = ++runId.current;
    setLoading(true);
    try {
      const { data } = await client.get("/analytics/summary", {
        params: { from, to },
        signal: controller.signal,
      });
      if (id !== runId.current) return;
      setSum({
        range: data?.range || { from, to },
        revenuePaid: Number(data?.revenuePaid || 0),
        revenueUnpaid: Number(data?.revenueUnpaid || 0),
        orders: {
          total: Number(data?.orders?.total || 0),
          paid: Number(data?.orders?.paid || 0),
          unpaid: Number(data?.orders?.unpaid || 0),
          avgPaidOrderValue: Number(data?.orders?.avgPaidOrderValue || 0),
        },
      });
      setAlertMsg("");
    } catch (e) {
      if (e?.name === "CanceledError" || e?.name === "AbortError") return;
      if (id !== runId.current) return;
      setAlertMsg(e?.response?.data?.message || "Không tải được dữ liệu thống kê");
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }

  // Bảo toàn điều kiện from ≤ to.
  useEffect(() => {
    if (from && to && from > to) {
      setTo(from); // luôn đảm bảo Đến ngày ≥ Từ ngày
      return;
    }
    load();
    return () => {
      runId.current++;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [from, to]);

  /* charts */
  const pieSeries = useMemo(
    () => [sum.revenuePaid || 0, sum.revenueUnpaid || 0],
    [sum.revenuePaid, sum.revenueUnpaid]
  );
  const pieOptions = useMemo(
    () => ({
      chart: { type: "donut", toolbar: { show: false } },
      labels: ["Đã thanh toán", "Chưa thanh toán"],
      dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
      legend: { position: "bottom" },
      tooltip: { y: { formatter: (v) => `${fmtMoney(v)} đ` } },
      stroke: { width: 1 },
    }),
    []
  );

  const colSeries = useMemo(
    () => [{ name: "Số đơn", data: [sum.orders.paid || 0, sum.orders.unpaid || 0] }],
    [sum.orders.paid, sum.orders.unpaid]
  );
  const colOptions = useMemo(
    () => ({
      chart: { type: "bar", toolbar: { show: false } },
      xaxis: { categories: ["Đã thanh toán", "Chưa thanh toán"] },
      plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v) => `${v} đơn` } },
      yaxis: { forceNiceScale: true },
    }),
    []
  );

  /* presets */
  const setThisMonth = () => { setFrom(monthStartYMD()); setTo(todayYMD()); };
  const setThisWeek  = () => { setFrom(weekStartYMD());  setTo(todayYMD()); };
  const setToday     = () => { const t = todayYMD(); setFrom(t); setTo(t); };

  return (
    <Layout>
      {/* === CARD full-height: KHÔNG TRÀN, chỉ phần dưới cuộn === */}
      <div className="card page-flex vh-card">
        <div className="card-body page-flex">
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Tổng quan</h2>
          </div>

          {/* Alert */}
          {alertMsg && (
            <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
              {alertMsg}
              <button type="button" className="btn-close" onClick={() => setAlertMsg("")} />
            </div>
          )}

          {/* Filters + KPI (ngoài vùng cuộn) */}
          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <label className="form-label small">Từ ngày</label>
              <input
                type="date"
                className="form-control"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                /* có thể đặt max={to} nếu muốn ngăn chọn quá 'Đến ngày'.
                   Không bắt buộc vì useEffect đã tự kéo 'to' theo 'from'. */
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Đến ngày</label>
              <input
                type="date"
                className="form-control"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from || undefined}  // CHỈ CHỌN ĐƯỢC NGÀY ≥ 'Từ ngày'
                /* KHÔNG set max để cho phép chọn cả tương lai */
              />
            </div>
            <div className="col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-outline-secondary" type="button" onClick={setToday}>Hôm nay</button>
              <button className="btn btn-outline-secondary" type="button" onClick={setThisWeek}>Tuần này</button>
              <button className="btn btn-outline-secondary" type="button" onClick={setThisMonth}>Tháng này</button>
              {loading && <span className="spinner-border spinner-border-sm ms-auto" />}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="p-3 border rounded-3 h-100">
                <div className="text-muted small">Doanh thu đã thanh toán</div>
                <div className="fs-4 fw-bold">{fmtMoney(sum.revenuePaid)} đ</div>
                <div className="text-muted small">({sum.range.from} → {sum.range.to})</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded-3 h-100">
                <div className="text-muted small">Doanh thu chưa thanh toán</div>
                <div className="fs-4 fw-bold">{fmtMoney(sum.revenueUnpaid)} đ</div>
                <div className="text-muted small">({sum.range.from} → {sum.range.to})</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded-3 h-100">
                <div className="text-muted small">Số đơn</div>
                <div className="fs-4 fw-bold">{sum.orders.total}</div>
                <div className="text-muted small">Đã TT: {sum.orders.paid} • Chưa TT: {sum.orders.unpaid}</div>
                <div className="text-muted small">Giá trị TB/đơn (đã TT): {fmtMoney(sum.orders.avgPaidOrderValue)} đ</div>
              </div>
            </div>
          </div>

          {/* ===== VÙNG CUỘN – chỉ phần này overflow ===== */}
          <div className="scroll-zone">
            <div className="row g-3">
              <div className="col-lg-6">
                <div className="p-3 border rounded-3 h-100">
                  <div className="d-flex align-items-center mb-2">
                    <h5 className="m-0">Cơ cấu doanh thu</h5>
                    {loading && <span className="spinner-border spinner-border-sm ms-2" />}
                  </div>
                  <Chart options={pieOptions} series={pieSeries} type="donut" height={320} />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="p-3 border rounded-3 h-100">
                  <div className="d-flex align-items-center mb-2">
                    <h5 className="m-0">Số đơn theo trạng thái</h5>
                    {loading && <span className="spinner-border spinner-border-sm ms-2" />}
                  </div>
                  <Chart options={colOptions} series={colSeries} type="bar" height={320} />
                </div>
              </div>

              {/* nếu còn section khác thì đặt tiếp ở đây */}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
