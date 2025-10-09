// frontend/admin-doctor-app/src/pages/doctor/PatientsReadOnly.jsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

const ALLOWED_SORT = ["maBenhNhan", "hoTen", "ngayTao"];

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("vi-VN");
};

const GenderChip = ({ v }) => {
  const label = v === "M" ? "Nam" : v === "F" ? "Nữ" : "Khác";
  const cls =
    label === "Nam" ? "bg-primary" :
    label === "Nữ" ? "bg-danger" : "bg-secondary";
  return <span className={`badge ${cls}`}>{label}</span>;
};

export default function PatientsReadOnly() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState("maBenhNhan");
  const [order, setOrder] = useState("DESC");

  const [active, setActive] = useState(null);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const [qLive, setQLive] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qLive), 400);
    return () => clearTimeout(t);
  }, [qLive]);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        trangThai: trangThai === "" ? undefined : Number(trangThai),
        limit,
        offset,
        orderBy,
        order,
      };
      const res = await client.get("/patients", { params });
      const items = (res.data?.items || []).map(x => ({
        ...x,
        trangThai: Number(x.trangThai), // ép kiểu tại đây
      }));
      setRows(items);
      setTotal(Number(res.data?.total || 0));
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) setError("Bạn chưa đăng nhập.");
      else if (status === 403) setError("Bạn không có quyền xem danh sách bệnh nhân (chỉ ADMIN).");
      else setError(e?.response?.data?.message || "Không thể tải dữ liệu.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [q, from, to, trangThai, limit, offset, orderBy, order]);

  const changeSort = (col) => {
    if (!ALLOWED_SORT.includes(col)) return;
    if (orderBy === col) setOrder(order === "ASC" ? "DESC" : "ASC");
    else { setOrderBy(col); setOrder("ASC"); }
  };

  const SortHeader = ({ col, children }) => (
    <th role="button" onClick={() => changeSort(col)} className="text-nowrap">
      <div className="d-flex align-items-center gap-1">
        <span>{children}</span>
        <span className="text-muted small">
          {orderBy === col ? (order === "ASC" ? "▲" : "▼") : "↕"}
        </span>
      </div>
    </th>
  );

  const goto = (p) => {
    const n = Math.min(Math.max(1, p), totalPages);
    setPage(n);
  };

  return (
    <Layout>
      {/* Gói toàn bộ nội dung trong container có scroll */}
      <div className="container-fluid py-3" style={{ overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="mb-0">Bệnh nhân (chỉ xem)</h4>
          <span className="text-secondary">Tổng: {total}</span>
        </div>

        {/* Bộ lọc */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-12 col-lg-4">
                <label className="form-label mb-1">Tìm kiếm</label>
                <input
                  className="form-control"
                  placeholder="Họ tên / CCCD / SĐT / Email / BHYT / Mã BN"
                  value={qLive}
                  onChange={(e) => { setQLive(e.target.value); setPage(1); }}
                />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label mb-1">Từ ngày</label>
                <input
                  type="date"
                  className="form-control"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label mb-1">Đến ngày</label>
                <input
                  type="date"
                  className="form-control"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setPage(1); }}
                />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label mb-1">Trạng thái</label>
                <select
                  className="form-select"
                  value={trangThai}
                  onChange={(e) => { setTrangThai(e.target.value); setPage(1); }}
                >
                  <option value="">Tất cả</option>
                  <option value="1">Hoạt động</option>
                  <option value="0">Khoá</option>
                </select>
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label mb-1">Hiển thị</label>
                <select
                  className="form-select"
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                >
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/trang</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-responsive" style={{ maxHeight: "calc(100vh - 350px)", overflowY: "auto" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <SortHeader col="maBenhNhan">Mã BN</SortHeader>
                  <SortHeader col="hoTen">Họ tên</SortHeader>
                  <th>Ngày sinh</th>
                  <th>Giới tính</th>
                  <th className="text-nowrap">CCCD</th>
                  <th className="text-nowrap">SĐT</th>
                  <th className="d-none d-lg-table-cell">Email</th>
                  <th className="d-none d-xl-table-cell">BHYT</th>
                  <SortHeader col="ngayTao">Ngày tạo</SortHeader>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-4"><div className="spinner-border" role="status" /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={11} className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.maBenhNhan}>
                      <td className="fw-semibold">{r.maBenhNhan}</td>
                      <td>{r.hoTen}</td>
                      <td>{fmtDate(r.ngaySinh)}</td>
                      <td><GenderChip v={r.gioiTinh} /></td>
                      <td>{r.soCCCD}</td>
                      <td>{r.soDienThoai}</td>
                      <td className="d-none d-lg-table-cell">{r.email}</td>
                      <td className="d-none d-xl-table-cell">{r.soBHYT}</td>
                      <td>{fmtDate(r.ngayTao)}</td>
                      <td>
                        {Number(r.trangThai) === 1
                          ? <span className="badge bg-success">Hoạt động</span>
                          : <span className="badge bg-secondary">Khoá</span>}
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setActive(r)}>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <div className="card-footer d-flex flex-wrap align-items-center gap-2 justify-content-between">
            <div className="text-muted small">
              Trang {page}/{totalPages} · Hiển thị {rows.length} / {total}
            </div>
            <nav>
              <ul className="pagination mb-0">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(1)}>«</button>
                </li>
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(page - 1)}>‹</button>
                </li>
                <li className="page-item active"><span className="page-link">{page}</span></li>
                <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(page + 1)}>›</button>
                </li>
                <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goto(totalPages)}>»</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Modal chi tiết */}
        <div className={`modal ${active ? "show d-block" : ""}`} tabIndex="-1" style={{ background: active ? "rgba(0,0,0,.5)" : "transparent" }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết bệnh nhân</h5>
                <button type="button" className="btn-close" onClick={() => setActive(null)}></button>
              </div>
              <div className="modal-body">
                {!active ? null : (
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="mb-2"><strong>Mã BN:</strong> {active.maBenhNhan}</div>
                      <div className="mb-2"><strong>Họ tên:</strong> {active.hoTen}</div>
                      <div className="mb-2"><strong>Ngày sinh:</strong> {fmtDate(active.ngaySinh)}</div>
                      <div className="mb-2"><strong>Giới tính:</strong> <GenderChip v={active.gioiTinh} /></div>
                      <div className="mb-2"><strong>Ngày tạo:</strong> {fmtDate(active.ngayTao)}</div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="mb-2"><strong>CCCD:</strong> {active.soCCCD}</div>
                      <div className="mb-2"><strong>BHYT:</strong> {active.soBHYT}</div>
                      <div className="mb-2"><strong>SĐT:</strong> {active.soDienThoai}</div>
                      <div className="mb-2"><strong>Email:</strong> {active.email}</div>
                      <div className="mb-2"><strong>Địa chỉ:</strong> {active.diaChi}</div>
                      <div className="mb-2"><strong>Tình trạng:</strong> {Number(active.trangThai) === 1 ? "Hoạt động" : "Khoá"}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setActive(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
