import { useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import Layout from "../../components/Layout";

/* ---------- helpers ---------- */
const DEFAULT_LIMIT = 10;

const pad2 = (n) => String(n).padStart(2, "0");

// Chuẩn hóa mọi kiểu nhập giờ về "HH:mm"
function normalizeHHMM(input) {
  if (!input) return "";
  let s = String(input).trim();

  // Nếu đã là HH:mm
  if (/^\d{2}:\d{2}$/.test(s)) return s;

  // "8:00 AM", "5 PM", "08:00 pm", ...
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(AM|PM)?$/i);
  if (m) {
    let h = parseInt(m[1], 10);
    let mi = m[2] ? parseInt(m[2], 10) : 0;
    const ap = (m[3] || "").toUpperCase();
    if (ap === "AM") { if (h === 12) h = 0; }
    else if (ap === "PM") { if (h !== 12) h += 12; }
    if (Number.isNaN(h) || Number.isNaN(mi)) return "";
    return `${pad2(h)}:${pad2(mi)}`;
  }

  // "8:00" hoặc "17.30"
  s = s.replace(".", ":");
  const m2 = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m2) {
    const h = parseInt(m2[1], 10);
    const mi = parseInt(m2[2], 10);
    if (Number.isNaN(h) || Number.isNaN(mi)) return "";
    return `${pad2(h)}:${pad2(mi)}`;
  }

  return "";
}

const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
};

const duration = (start, end) => {
  const a = toMinutes(start);
  const b = toMinutes(end);
  return b > a ? b - a : 0;
};

/* ---------- page ---------- */
export default function AdminShifts() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get("/workshifts", {
        params: { q, status, limit, offset },
      });
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi tải danh sách ca làm việc");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [q, status, limit, offset]);

  const next = () =>
    setOffset((o) => Math.min(o + limit, Math.max(0, (totalPages - 1) * limit)));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  return (
    <Layout>
      {/* Khung trang co giãn + bảng cuộn (dùng class chung trong styles.css) */}
      <div className="card page-flex">
        <div className="card-body d-flex flex-column">
          <div className="d-flex align-items-center mb-3">
            <h2 className="me-auto m-0">Quản lý ca làm việc</h2>
            <button
              className="btn btn-primary"
              onClick={() => { setEditItem(null); setShowModal(true); }}
            >
              + Thêm ca
            </button>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder="Tìm theo tên ca / mô tả..."
                value={q}
                onChange={(e) => { setOffset(0); setQ(e.target.value); }}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e) => { setOffset(0); setStatus(e.target.value); }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Ngưng</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={load}>Tải lại</button>
            </div>
          </div>

          {/* Vùng bảng scroll + header sticky */}
          <div className="table-zone">
            <div className="table-responsive table-sticky">
              <table className="table table-hover align-middle mb-0 table-tight">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 140 }}>Mã ca</th>
                    <th style={{ width: 220 }}>Tên ca</th>
                    <th style={{ width: 120 }} className="text-center">Giờ vào</th>
                    <th style={{ width: 120 }} className="text-center">Giờ ra</th>
                    <th style={{ width: 120 }} className="text-center">Thời lượng (p)</th>
                    <th>Mô tả</th>
                    <th style={{ width: 130 }} className="text-center">Trạng thái</th>
                    <th style={{ width: 160 }} className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">Chưa có dữ liệu</td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading…</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {items.map((it) => (
                    <tr key={it.maCaLamViec}>
                      <td><span className="badge bg-secondary">{it.maCaLamViec}</span></td>
                      <td>{it.tenCaLamViec}</td>
                      <td className="text-center">{it.gioVao?.slice(0, 5)}</td>
                      <td className="text-center">{it.gioRa?.slice(0, 5)}</td>
                      <td className="text-center">{duration(it.gioVao?.slice(0, 5), it.gioRa?.slice(0, 5))}</td>
                      <td>{it.moTa || "-"}</td>
                      <td className="text-center">
                        {Number(it.trangThai) === 1
                          ? <span className="badge bg-success">Hoạt động</span>
                          : <span className="badge bg-secondary">Ngưng</span>}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => { setEditItem(it); setShowModal(true); }}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setConfirmDel({ ma: it.maCaLamViec, ten: it.tenCaLamViec })}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination ngoài vùng scroll */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">Tổng: {total} • Trang {page}/{totalPages}</small>
              <div>
                <button className="btn btn-outline-secondary me-2" disabled={page <= 1} onClick={prev}>← Trước</button>
                <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={next}>Sau →</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ShiftModal
          data={editItem}
          onClose={() => setShowModal(false)}
          onSubmit={async (payload) => {
            try {
              if (editItem) {
                await client.put(`/workshifts/${encodeURIComponent(editItem.maCaLamViec)}`, payload);
              } else {
                await client.post("/workshifts", payload);
              }
              setShowModal(false);
              await load();
            } catch (e) {
              alert(e?.response?.data?.message || "Không lưu được ca làm việc");
            }
          }}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          text={`Xóa ca “${confirmDel.ten}” ?`}
          onClose={() => setConfirmDel(null)}
          onConfirm={async () => {
            try {
              await client.delete(`/workshifts/${encodeURIComponent(confirmDel.ma)}`);
              setConfirmDel(null);
              await load();
            } catch (e) {
              alert(e?.response?.data?.message || "Không xóa được ca");
            }
          }}
        />
      )}
    </Layout>
  );
}

/* ---------- Modal tạo/sửa ---------- */
function ShiftModal({ data = null, onClose, onSubmit }) {
  const edit = !!data;

  const [tenCaLamViec, setTen] = useState(data?.tenCaLamViec || "");
  const [gioVao, setGioVao] = useState(data?.gioVao?.slice(0, 5) || "");
  const [gioRa, setGioRa] = useState(data?.gioRa?.slice(0, 5) || "");
  const [trangThai, setTrangThai] = useState(data?.trangThai ?? 1);
  const [moTa, setMoTa] = useState(data?.moTa || "");

  const submit = (e) => {
    e.preventDefault();

    const vIn = normalizeHHMM(gioVao);
    const vOut = normalizeHHMM(gioRa);

    if (!tenCaLamViec) return alert("Vui lòng nhập tên ca");
    if (!vIn) return alert("gioVao dạng HH:mm");
    if (!vOut) return alert("gioRa dạng HH:mm");
    if (toMinutes(vIn) >= toMinutes(vOut)) return alert("gioVao phải nhỏ hơn gioRa");

    onSubmit?.({
      tenCaLamViec,
      gioVao: vIn,
      gioRa: vOut,
      trangThai: Number(trangThai),
      moTa: moTa || null,
    });
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} aria-modal="true" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content" onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">{edit ? "Sửa ca" : "Thêm ca"}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            {/* body có cuộn khi dài */}
            <div className="modal-body modal-scroll">
              <div className="mb-3">
                <label className="form-label">
                  Tên ca <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control"
                  value={tenCaLamViec}
                  onChange={(e) => setTen(e.target.value)}
                  placeholder="Ví dụ: Ca Sáng"
                  autoFocus
                />
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">
                    Giờ vào <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    className="form-control"
                    value={gioVao}
                    onChange={(e) => setGioVao(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Giờ ra <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    className="form-control"
                    value={gioRa}
                    onChange={(e) => setGioRa(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3 mt-1">
                <div className="col-md-6">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={trangThai} onChange={(e) => setTrangThai(e.target.value)}>
                    <option value={1}>Hoạt động</option>
                    <option value={0}>Ngưng</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Mô tả</label>
                  <input
                    className="form-control"
                    value={moTa}
                    onChange={(e) => setMoTa(e.target.value)}
                    placeholder="Buổi Sáng / Buổi Chiều…"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer justify-content-center">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary">{edit ? "Lưu thay đổi" : "Tạo ca"}</button>
            </div>
          </form>
        </div>
      </div>
      {/* backdrop */}
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

/* ---------- Confirm ---------- */
function ConfirmModal({ text, onClose, onConfirm }) {
  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} aria-modal="true" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Xác nhận</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="m-0">{text}</p>
            </div>
            <div className="modal-footer justify-content-center">
              <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button className="btn btn-danger" onClick={onConfirm}>Xóa</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
