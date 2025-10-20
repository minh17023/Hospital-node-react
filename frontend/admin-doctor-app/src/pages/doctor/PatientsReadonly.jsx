import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

/* ===== Settings & helpers ===== */
const ALLOWED_SORT = ["maBenhNhan", "hoTen", "firstVisit", "lastVisit"];

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("vi-VN");
};
const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const date = dt.toLocaleDateString("vi-VN");
  const time = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
};

const GenderChip = ({ v }) => {
  const label = v === "M" ? "Nam" : v === "F" ? "Nữ" : "Khác";
  const cls = label === "Nam" ? "bg-primary" : label === "Nữ" ? "bg-danger" : "bg-secondary";
  return <span className={`badge ${cls}`}>{label}</span>;
};

export default function PatientsReadOnly() {
  /* ===== State ===== */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trangThai, setTrangThai] = useState("");

  // paging (cố định 10/trang) + sort
  const limit = 10;
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState("lastVisit");
  const [order, setOrder] = useState("DESC");

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [patient, setPatient] = useState(null);

  // doctor id from localStorage
  const maBacSi = useMemo(() => {
    try {
      const me = JSON.parse(localStorage.getItem("ME") || "null");
      return me?.maBacSi || null;
    } catch { return null; }
  }, []);

  // debounced q
  useEffect(() => {
    const t = setTimeout(() => setQ(qLive.trim()), 350);
    return () => clearTimeout(t);
  }, [qLive]);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const goto = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  /* ===== Load list (bệnh nhân theo bác sĩ) ===== */
  async function fetchList() {
    setLoading(true);
    setError("");
    try {
      if (!maBacSi) {
        setRows([]); setTotal(0);
        setError("Không tìm thấy mã bác sĩ trong bộ nhớ cục bộ. Vui lòng đăng nhập lại.");
        return;
      }
      const { data } = await client.get(`/doctors/${maBacSi}/patients`, {
        params: {
          q: q || undefined,
          from: from || undefined,
          to: to || undefined,
          trangThai: trangThai === "" ? undefined : Number(trangThai),
          limit, offset, orderBy, order,
        },
      });
      const items = (data?.items || []).map((x) => ({ ...x, trangThai: Number(x.trangThai ?? 1) }));
      setRows(items);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      const s = e?.response?.status;
      if (s === 401) setError("Bạn chưa đăng nhập.");
      else if (s === 403) setError("Bạn không có quyền xem danh sách bệnh nhân.");
      else setError(e?.response?.data?.message || "Không thể tải dữ liệu.");
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); },
    [q, from, to, trangThai, offset, orderBy, order, maBacSi]);

  /* ===== Sort ===== */
  const changeSort = (col) => {
    if (!ALLOWED_SORT.includes(col)) return;
    if (orderBy === col) setOrder(order === "ASC" ? "DESC" : "ASC");
    else { setOrderBy(col); setOrder("ASC"); }
  };

  const SortHeader = ({ col, children, className = "" }) => (
    <th role="button" onClick={() => changeSort(col)} className={`text-nowrap ${className}`} title="Sắp xếp">
      <div className="d-flex align-items-center gap-1">
        <span>{children}</span>
        <span className="text-muted small">
          {orderBy === col ? (order === "ASC" ? "▲" : "▼") : "↕"}
        </span>
      </div>
    </th>
  );

  const clearFilters = () => {
    setQLive(""); setQ("");
    setFrom(""); setTo(""); setTrangThai("");
    setPage(1);
  };

  /* ===== Detail: fetch full by patient code ===== */
  async function openDetail(maBenhNhan) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailErr("");
    setPatient(null);
    try {
      const { data } = await client.get(`/patients/${encodeURIComponent(maBenhNhan)}`);
      // API trả { patient: { ...fields } }
      setPatient(data?.patient || null);
    } catch (e) {
      setDetailErr(e?.response?.data?.message || "Không tải được chi tiết hồ sơ.");
    } finally {
      setDetailLoading(false);
    }
  }
  const closeDetail = () => { setDetailOpen(false); setPatient(null); setDetailErr(""); };

  return (
    <Layout>
      {/* ===== Styles cho layout full-height & bảng cân đối ===== */}
      <style>{`
        .page-flex{display:flex;flex-direction:column;height:calc(100vh - 90px);min-height:0}
        .table-zone{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
        .table-scroll{flex:1 1 auto;min-height:0;overflow:auto;border-radius:.25rem}
        .table-tight th,.table-tight td{padding-top:.6rem;padding-bottom:.6rem;vertical-align:middle}
        .table-scroll table thead th{position:sticky;top:0;z-index:1;background:var(--bs-light)}
        .cell-truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .col-id{width:120px}
        .col-name{min-width:200px;max-width:260px}
        .col-birth{width:120px}
        .col-gender{width:90px}
        .col-last{width:160px}
        .col-first{width:160px}
        .col-count{width:120px}
        .col-status{width:120px}
        .col-actions{width:110px}
      `}</style>

      <div className="card page-flex">
        <div className="card-body d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Bệnh nhân (chỉ xem)</h2>
          </div>

          {/* Alert lỗi */}
          {error && <div className="alert alert-warning py-2 mb-3">{error}</div>}

          {/* Filters */}
          <div className="row g-2 mb-3">
            <div className="col-lg-5 col-md-6">
              <input
                className="form-control"
                placeholder="Tìm (Họ tên / Mã BN)"
                value={qLive}
                onChange={(e) => { setQLive(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-lg-2 col-md-6">
              <input type="date" className="form-control" value={from}
                     onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="col-lg-2 col-md-6">
              <input type="date" className="form-control" value={to}
                     onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
            <div className="col-lg-2 col-md-6">
              <select className="form-select" value={trangThai}
                      onChange={(e) => { setTrangThai(e.target.value); setPage(1); }}>
                <option value="">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Khoá</option>
              </select>
            </div>
            <div className="col-lg-1 col-md-6 d-grid">
              <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
                Xóa
              </button>
            </div>
          </div>

          {/* ===== Vùng bảng cuộn ===== */}
          <div className="table-zone">
            <div className="table-scroll">
              <table className="table table-hover align-middle mb-0 table-tight">
                <thead className="table-light">
                  <tr>
                    <SortHeader col="maBenhNhan" className="col-id">Mã BN</SortHeader>
                    <SortHeader col="hoTen" className="col-name">Họ tên</SortHeader>
                    <th className="col-birth">Ngày sinh</th>
                    <th className="col-gender">Giới tính</th>
                    {/* ĐÃ XÓA: CCCD / SĐT / Email ở bảng */}
                    <SortHeader col="lastVisit" className="col-last">Lần khám gần nhất</SortHeader>
                    <SortHeader col="firstVisit" className="col-first">Lần khám đầu</SortHeader>
                    <th className="col-count">Số lần khám</th>
                    <th className="col-status">Trạng thái</th>
                    <th className="text-end col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-4">
                        <div className="spinner-border" role="status" />
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={10} className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.maBenhNhan}>
                        <td className="fw-semibold">{r.maBenhNhan}</td>
                        <td><div className="cell-truncate" title={r.hoTen}>{r.hoTen}</div></td>
                        <td>{fmtDate(r.ngaySinh)}</td>
                        <td><GenderChip v={r.gioiTinh} /></td>
                        <td>{fmtDate(r.lastVisit)}</td>
                        <td>{fmtDate(r.firstVisit)}</td>
                        <td>{r.soLanKham ?? "-"}</td>
                        <td>
                          {Number(r.trangThai) === 1
                            ? <span className="badge bg-success">Hoạt động</span>
                            : <span className="badge bg-secondary">Khoá</span>}
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary"
                                  onClick={() => openDetail(r.maBenhNhan)}>
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination – ngoài vùng scroll */}
            <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 gap-2">
              <small className="text-muted">
                Trang {page}/{totalPages} • Hiển thị {rows.length} / {total}
              </small>
              <div className="btn-group">
                <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => goto(1)}>&laquo;</button>
                <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => goto(page - 1)}>Trước</button>
                <button className="btn btn-outline-secondary" disabled>{page}</button>
                <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => goto(page + 1)}>Sau</button>
                <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => goto(totalPages)}>&raquo;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal chi tiết — FULL thông tin từ API /patients/:maBenhNhan ===== */}
      {detailOpen && (
        <>
          <div className="modal fade show" style={{ display: "block" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Chi tiết bệnh nhân</h5>
                  <button type="button" className="btn-close" onClick={closeDetail}></button>
                </div>

                <div className="modal-body">
                  {detailLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border" role="status" />
                    </div>
                  ) : detailErr ? (
                    <div className="alert alert-danger py-2">{detailErr}</div>
                  ) : !patient ? (
                    <div className="text-muted">Không có dữ liệu.</div>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="mb-2"><strong>Mã BN:</strong> {patient.maBenhNhan}</div>
                        <div className="mb-2"><strong>Họ tên:</strong> {patient.hoTen}</div>
                        <div className="mb-2"><strong>Ngày sinh:</strong> {fmtDate(patient.ngaySinh)}</div>
                        <div className="mb-2"><strong>Giới tính:</strong> <GenderChip v={patient.gioiTinh} /></div>
                        <div className="mb-2"><strong>CCCD:</strong> {patient.soCCCD || "-"}</div>
                        <div className="mb-2"><strong>Số BHYT:</strong> {patient.soBHYT || "-"}</div>
                        <div className="mb-2"><strong>Địa chỉ:</strong> {patient.diaChi || "-"}</div>
                      </div>

                      <div className="col-md-6">
                        <div className="mb-2"><strong>SĐT:</strong> {patient.soDienThoai || "-"}</div>
                        <div className="mb-2"><strong>Email:</strong> {patient.email || "-"}</div>
                        <div className="mb-2"><strong>Nghề nghiệp:</strong> {patient.ngheNghiep || "-"}</div>
                        <div className="mb-2"><strong>Tình trạng hôn nhân:</strong> {patient.tinhTrangHonNhan || "-"}</div>
                        <div className="mb-2"><strong>Người liên hệ:</strong> {patient.nguoiLienHe || "-"}</div>
                        <div className="mb-2"><strong>SĐT liên hệ:</strong> {patient.sdtLienHe || "-"}</div>
                        <div className="mb-2"><strong>Ngày tạo:</strong> {fmtDateTime(patient.ngayTao)}</div>
                        <div className="mb-2"><strong>Người tạo:</strong> {patient.nguoiTao || "-"}</div>
                        <div className="mb-2">
                          <strong>Tình trạng:</strong>{" "}
                          {Number(patient.trangThai) === 1 ? "Đang điều trị" : "Khoá"}
                        </div>
                      </div>

                      {/* Nếu BE có join thêm các trường sau, hiển thị luôn */}
                      {"lastVisit" in patient || "firstVisit" in patient || "soLanKham" in patient ? (
                        <div className="col-12">
                          <hr className="my-2" />
                          <div className="row">
                            <div className="col-md-4"><strong>Lần khám gần nhất:</strong> {fmtDate(patient.lastVisit)}</div>
                            <div className="col-md-4"><strong>Lần khám đầu:</strong> {fmtDate(patient.firstVisit)}</div>
                            <div className="col-md-4"><strong>Số lần khám:</strong> {patient.soLanKham ?? "-"}</div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="modal-footer justify-content-center">
                  <button className="btn btn-secondary" onClick={closeDetail}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeDetail} />
        </>
      )}
    </Layout>
  );
}
