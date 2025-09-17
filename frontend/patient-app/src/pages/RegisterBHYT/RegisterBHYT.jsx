import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";

export default function RegisterBHYT() {
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [f, setF] = useState({ soThe: "", denNgay: "", trangThai: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("PATIENT_INFO");
    if (!s) return nav("/");
    setP(JSON.parse(s));
  }, [nav]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    if (!f.soThe || !f.denNgay) return alert("Nhập số thẻ & ngày hết hạn");
    setLoading(true);
    try {
      await client.post(`/patients/${p.idBenhNhan}/bhyt`, f);
      nav("/menu");
    } catch (e) {
      alert(e?.response?.data?.message || "Không thể tạo BHYT");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    // Nếu muốn nhớ quyết định này: localStorage.setItem("SKIP_BHYT", "1");
    nav("/menu");
  };

  if (!p) return null;

  return (
    <div className="container py-4">
      <div className="card p-4 mx-auto" style={{ maxWidth: 720 }}>
        <h3 className="mb-3">Đăng ký thẻ BHYT</h3>

        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label fw-semibold">Số thẻ *</label>
            <input
              className="form-control"
              value={f.soThe}
              onChange={set("soThe")}
              placeholder="VD: HC1234567890"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Ngày hết hạn *</label>
            <input
              type="date"
              className="form-control"
              value={f.denNgay}
              onChange={set("denNgay")}
            />
          </div>
        </div>

        <div className="d-grid gap-2 mt-3">
          <button
            className="btn btn-primary btn-lg"
            disabled={loading}
            onClick={submit}
            type="button"
          >
            {loading ? "Đang lưu..." : "Lưu & tiếp tục"}
          </button>

          <button
            className="btn btn-outline-secondary"
            onClick={skip}
            type="button"
            disabled={loading}
            title="Nếu chưa có thẻ BHYT hoặc muốn khám dịch vụ"
          >
            Bỏ qua (không có BHYT)
          </button>
        </div>
      </div>
    </div>
  );
}
