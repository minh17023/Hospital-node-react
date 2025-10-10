import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

/* ===== Helpers ===== */
const fmtTime = (t) => (t ? String(t).slice(0, 5) : "-");
const fmtDate = (d) => (d ? String(d).slice(0, 10) : "-");
const yesNo = (n) => (Number(n) === 1 ? "Hoạt động" : "Ngưng");
const badge = (n) => (Number(n) === 1 ? "bg-success" : "bg-secondary");

/* ===== Async selects (Doctor / Clinic / Shift) ===== */
function useFetchList(fetcher, deps = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        const arr = await fetcher();
        if (ok) setItems(arr);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, deps);
  return { items, loading };
}

function SelectDoctor({ value, onChange, size = "sm" }) {
  const [q, setQ] = useState("");
  const { items, loading } = useFetchList(async () => {
    const { data } = await client.get("/doctors", {
      params: { keyword: q || undefined, limit: 1000, offset: 0 },
    });
    return data?.items || [];
  }, [q]);
  return (
    <div className="d-flex gap-2">
      <select
        className={`form-select form-select-${size}`}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">-- Chọn bác sĩ --</option>
        {items.map((d) => (
          <option key={d.maBacSi} value={d.maBacSi}>
            {d.maBacSi} — {d.tenBacSi || d.hoTen}
          </option>
        ))}
      </select>
      <input
        className={`form-control form-control-${size}`}
        placeholder="Tìm BS…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 160 }}
        disabled={loading}
      />
    </div>
  );
}

function SelectClinic({ value, onChange, size = "sm" }) {
  const [q, setQ] = useState("");
  const { items, loading } = useFetchList(async () => {
    const { data } = await client.get("/clinics", {
      params: { q: q || undefined, limit: 1000, page: 1 },
    });
    return data?.items || [];
  }, [q]);
  return (
    <div className="d-flex gap-2">
      <select
        className={`form-select form-select-${size}`}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">-- Chọn phòng khám --</option>
        {items.map((c) => (
          <option key={c.maPhongKham} value={c.maPhongKham}>
            {c.maPhongKham} — {c.tenPhongKham}
          </option>
        ))}
      </select>
      <input
        className={`form-control form-control-${size}`}
        placeholder="Tìm PK…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 160 }}
        disabled={loading}
      />
    </div>
  );
}

function SelectShift({ value, onChange, multiple = false, size = "sm" }) {
  const [q, setQ] = useState("");
  const { items, loading } = useFetchList(async () => {
    const { data } = await client.get("/workshifts", {
      params: { q: q || undefined, limit: 1000, offset: 0 },
    });
    return data?.items || [];
  }, [q]);

  return (
    <div className="d-flex gap-2">
      <select
        multiple={multiple}
        className={`form-select form-select-${size}`}
        value={value || (multiple ? [] : "")}
        onChange={(e) => {
          if (!multiple) onChange?.(e.target.value);
          else onChange?.(Array.from(e.target.selectedOptions).map((o) => o.value));
        }}
        style={multiple ? { height: 140 } : undefined}
      >
        {!multiple && <option value="">-- Chọn ca --</option>}
        {items.map((s) => (
          <option key={s.maCaLamViec} value={s.maCaLamViec}>
            {s.maCaLamViec} — {s.tenCaLamViec} ({fmtTime(s.gioVao)}–{fmtTime(s.gioRa)})
          </option>
        ))}
      </select>
      <input
        className={`form-control form-control-${size}`}
        placeholder="Tìm ca…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 160 }}
        disabled={loading}
      />
    </div>
  );
}

/* ====== Modals ====== */
function useModalChrome(onClose) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    const esc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);
}

function CreateModal({ onClose, onDone }) {
  useModalChrome(onClose);
  const [maBacSi, setMaBacSi] = useState("");
  const [maPhongKham, setMaPhongKham] = useState("");
  const [maCaLamViec, setMaCaLamViec] = useState("");
  const [ngayLamViec, setNgayLamViec] = useState("");
  const [soLuong, setSoLuong] = useState(20);
  const [status, setStatus] = useState(1);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!maBacSi || !maPhongKham || !maCaLamViec || !ngayLamViec) {
      return alert("Vui lòng nhập đủ bác sĩ, phòng khám, ca, ngày");
    }
    setSaving(true);
    try {
      await client.post("/schedules", {
        maBacSi, maPhongKham, maCaLamViec, ngayLamViec,
        soLuongBenhNhanToiDa: Number(soLuong) || 0,
        trangThaiLamViec: Number(status) || 0,
      });
      onDone?.();
      onClose?.();
    } catch (e2) {
      alert(e2?.response?.data?.message || "Không tạo được lịch");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Thêm lịch làm việc</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Bác sĩ *</label>
                  <SelectDoctor value={maBacSi} onChange={setMaBacSi} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Phòng khám *</label>
                  <SelectClinic value={maPhongKham} onChange={setMaPhongKham} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Ca làm việc *</label>
                  <SelectShift value={maCaLamViec} onChange={setMaCaLamViec} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Ngày làm việc *</label>
                  <input type="date" className="form-control form-control-sm"
                         value={ngayLamViec} onChange={(e) => setNgayLamViec(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Số BN tối đa</label>
                  <input type="number" min={0} className="form-control form-control-sm"
                         value={soLuong} onChange={(e) => setSoLuong(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Trạng thái</label>
                  <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value={1}>Hoạt động</option>
                    <option value={0}>Ngưng</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer justify-content-center">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu…" : "Tạo lịch"}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function GenerateModal({ onClose, onDone }) {
  useModalChrome(onClose);
  const [maBacSi, setMaBacSi] = useState("");
  const [maPhongKham, setMaPhongKham] = useState("");
  const [shiftCodes, setShiftCodes] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [soLuong, setSoLuong] = useState(20);
  const [status, setStatus] = useState(1);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!maBacSi || !maPhongKham || !shiftCodes.length || !from || !to) {
      return alert("Nhập đủ bác sĩ, phòng khám, dải ngày, danh sách ca");
    }
    setSaving(true);
    try {
      await client.post("/schedules/generate", {
        maBacSi, maPhongKham, from, to,
        maCaLamViecList: shiftCodes,
        soLuongBenhNhanToiDa: Number(soLuong) || 0,
        trangThaiLamViec: Number(status) || 0,
      });
      onDone?.();
      onClose?.();
    } catch (e2) {
      alert(e2?.response?.data?.message || "Không generate được");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Generate nhiều ca</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Bác sĩ *</label>
                  <SelectDoctor value={maBacSi} onChange={setMaBacSi} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Phòng khám *</label>
                  <SelectClinic value={maPhongKham} onChange={setMaPhongKham} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small">Từ ngày *</label>
                  <input type="date" className="form-control form-control-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Đến ngày *</label>
                  <input type="date" className="form-control form-control-sm" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>

                <div className="col-md-6">
                  <label className="form-label small">Danh sách ca *</label>
                  <SelectShift multiple value={shiftCodes} onChange={setShiftCodes} />
                </div>

                <div className="col-md-3">
                  <label className="form-label small">Số BN tối đa</label>
                  <input type="number" min={0} className="form-control form-control-sm"
                         value={soLuong} onChange={(e) => setSoLuong(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Trạng thái</label>
                  <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value={1}>Hoạt động</option>
                    <option value={0}>Ngưng</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer justify-content-center">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Đang chạy…" : "Generate"}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function EditModal({ row, onClose, onDone }) {
  useModalChrome(onClose);
  const [maPhongKham, setMaPhongKham] = useState(row.maPhongKham);
  const [maCaLamViec, setMaCaLamViec] = useState(row.maCaLamViec);
  const [ngayLamViec, setNgayLamViec] = useState(fmtDate(row.ngayLamViec));
  const [soLuong, setSoLuong] = useState(row.soLuongBenhNhanToiDa);
  const [status, setStatus] = useState(row.trangThaiLamViec);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.put(`/schedules/${encodeURIComponent(row.maLichLamViec)}`, {
        maPhongKham, maCaLamViec, ngayLamViec,
        soLuongBenhNhanToiDa: Number(soLuong) || 0,
        trangThaiLamViec: Number(status) || 0,
      });
      onDone?.();
      onClose?.();
    } catch (e2) {
      alert(e2?.response?.data?.message || "Không cập nhật được");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Sửa lịch #{row.maLichLamViec}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Bác sĩ</label>
                  <input className="form-control form-control-sm" value={`${row.maBacSi} — ${row.tenBacSi || ""}`} readOnly />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Phòng khám</label>
                  <SelectClinic value={maPhongKham} onChange={setMaPhongKham} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Ca làm việc</label>
                  <SelectShift value={maCaLamViec} onChange={setMaCaLamViec} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Ngày làm việc</label>
                  <input type="date" className="form-control form-control-sm"
                         value={ngayLamViec} onChange={(e) => setNgayLamViec(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Số BN tối đa</label>
                  <input type="number" min={0} className="form-control form-control-sm"
                         value={soLuong} onChange={(e) => setSoLuong(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Trạng thái</label>
                  <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value={1}>Hoạt động</option>
                    <option value={0}>Ngưng</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer justify-content-center">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

/* ===== Page ===== */
export default function AdminSchedules() {
  // filters
  const [maBacSi, setMaBacSi] = useState("");
  const [maPhongKham, setMaPhongKham] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("ALL");

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // paging
  const [limit, setLimit] = useState(12);
  const [offset, setOffset] = useState(0);
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get("/schedules", {
        params: {
          maBacSi: maBacSi || undefined,
          maPhongKham: maPhongKham || undefined,
          from: from || undefined,
          to: to || undefined,
          trangThaiLamViec: status === "ALL" ? undefined : Number(status),
          limit, offset,
        },
      });
      setRows(data?.items || []);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      alert(e?.response?.data?.message || "Không tải được lịch");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [limit, offset]); // eslint-disable-line

  const submitFilter = async (e) => {
    e.preventDefault();
    setOffset(0);
    await load();
  };

  const next = () => setOffset((o) => Math.min(o + limit, Math.max(0, (totalPages - 1) * limit)));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  return (
    <Layout>
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý lịch làm việc</h2>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setShowGen(true)}>Generate</button>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Thêm lịch</button>
            </div>
          </div>

          {/* Filters */}
          <form className="row g-2 mb-3" onSubmit={submitFilter}>
            <div className="col-lg-3 col-md-6">
              <SelectDoctor value={maBacSi} onChange={setMaBacSi} />
            </div>
            <div className="col-lg-3 col-md-6">
              <SelectClinic value={maPhongKham} onChange={setMaPhongKham} />
            </div>
            <div className="col-lg-2 col-md-4">
              <input type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="col-lg-2 col-md-4">
              <input type="date" className="form-control" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="col-lg-2 col-md-4">
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">Tất cả</option>
                <option value="1">Hoạt động</option>
                <option value="0">Ngưng</option>
              </select>
            </div>
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-outline-secondary" type="submit">Tải dữ liệu</button>
              <button className="btn btn-outline-dark" type="button" onClick={() => {
                setMaBacSi(""); setMaPhongKham(""); setFrom(""); setTo(""); setStatus("ALL"); setOffset(0); load();
              }}>Xóa lọc</button>
              <div className="ms-auto d-flex gap-2">
                <select className="form-select" style={{ width: 120 }}
                        value={limit} onChange={(e) => { setLimit(+e.target.value); setOffset(0); }}>
                  {[12, 20, 30, 50].map(n => <option key={n} value={n}>{n} / trang</option>)}
                </select>
              </div>
            </div>
          </form>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 130 }}>Mã lịch</th>
                  <th>Bác sĩ</th>
                  <th>Phòng khám</th>
                  <th>Ca</th>
                  <th>Ngày</th>
                  <th className="text-center" style={{ width: 110 }}>Đã đặt / Tối đa</th>
                  <th style={{ width: 120 }}>Trạng thái</th>
                  <th style={{ width: 150 }} className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="py-4 text-center">
                    <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
                  </td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={8} className="py-4 text-center text-muted">Chưa có dữ liệu</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.maLichLamViec}>
                    <td><span className="badge bg-secondary">{r.maLichLamViec}</span></td>
                    <td className="text-nowrap">{r.maBacSi} — {r.tenBacSi}</td>
                    <td className="text-nowrap">{r.maPhongKham} — {r.tenPhongKham}</td>
                    <td className="text-nowrap">
                      {r.maCaLamViec} — {r.tenCaLamViec} ({fmtTime(r.gioVao)}–{fmtTime(r.gioRa)})
                    </td>
                    <td className="text-nowrap">{fmtDate(r.ngayLamViec)}</td>
                    <td className="text-center">{r.soLuongDaDangKy}/{r.soLuongBenhNhanToiDa}</td>
                    <td><span className={`badge ${badge(r.trangThaiLamViec)}`}>{yesNo(r.trangThaiLamViec)}</span></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditing(r)}>Sửa</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDel(r)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Tổng: {total} • Trang {page}/{totalPages}</small>
            <div>
              <button className="btn btn-outline-secondary me-2" disabled={page <= 1} onClick={prev}>← Trước</button>
              <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={next}>Sau →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onDone={load} />}
      {showGen && <GenerateModal onClose={() => setShowGen(false)} onDone={load} />}
      {editing && <EditModal row={editing} onClose={() => setEditing(null)} onDone={load} />}

      {confirmDel && (
        <>
          <div className="modal fade show" style={{ display: "block" }} onClick={() => setConfirmDel(null)}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Xác nhận</h5>
                  <button className="btn-close" onClick={() => setConfirmDel(null)} />
                </div>
                <div className="modal-body">
                  Xóa lịch #{confirmDel.maLichLamViec}? (chỉ xóa khi chưa ai đặt)
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Hủy</button>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      try {
                        await client.delete(`/schedules/${encodeURIComponent(confirmDel.maLichLamViec)}`);
                        setConfirmDel(null);
                        await load();
                      } catch (e) {
                        alert(e?.response?.data?.message || "Không xóa được");
                      }
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setConfirmDel(null)} />
        </>
      )}
    </Layout>
  );
}
