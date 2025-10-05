import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import client from "../../api/client";

export default function AdminAppointments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ngay, setNgay] = useState("");
  const [maBacSi, setMaBacSi] = useState("");

  const load = async () => {
    setLoading(true);
    const params = {};
    if (ngay) params.ngay = ngay;
    if (maBacSi) params.maBacSi = maBacSi;
    const { data } = await client.get("/appointments", { params });
    setRows(data?.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <Layout>
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-sm-4">
              <label className="form-label small">Ngày</label>
              <input type="date" className="form-control" value={ngay} onChange={e=>setNgay(e.target.value)} />
            </div>
            <div className="col-sm-4">
              <label className="form-label small">Mã bác sĩ</label>
              <input className="form-control" value={maBacSi} onChange={e=>setMaBacSi(e.target.value)} />
            </div>
            <div className="col-sm-4 d-flex align-items-end">
              <button className="btn btn-primary me-2" onClick={load}>Tải dữ liệu</button>
              <button className="btn btn-outline-secondary" onClick={()=>{setNgay(""); setMaBacSi("");}}>Xóa lọc</button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Mã</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Ngày</th><th>Giờ</th><th>STT</th><th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>Đang tải…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7}>Không có dữ liệu</td></tr>
                ) : rows.map(r => (
                  <tr key={r.maLichHen}>
                    <td>{r.maLichHen}</td>
                    <td>{r.tenBenhNhan || "-"}</td>
                    <td>{r.tenBacSi || "-"}</td>
                    <td>{r.ngayHen}</td>
                    <td>{(r.gioHen||"").slice(0,5)}</td>
                    <td>{r.sttKham}</td>
                    <td>
                      <span className={`badge ${Number(r.trangThai)===-1?"bg-secondary":Number(r.trangThai)===2?"bg-success":"bg-warning text-dark"}`}>
                        {Number(r.trangThai)===-1?"Đã hủy":Number(r.trangThai)===2?"Đã TT":"Chờ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </Layout>
  );
}
