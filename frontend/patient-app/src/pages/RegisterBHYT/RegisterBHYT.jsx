import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";

export default function RegisterBHYT() {
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [f, setF] = useState({ soThe: "", denNgay: "", trangThai: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("PATIENT_INFO") || sessionStorage.getItem("PATIENT_INFO");
    if (!raw) { nav("/"); return; }
    try {
      const patient = JSON.parse(raw);
      if (!patient?.maBenhNhan) { nav("/"); return; }
      setP(patient);
    } catch {
      nav("/");
    }
  }, [nav]);

  const set = (k) => (e) => setF((s0) => ({ ...s0, [k]: e.target.value }));

  const submit = async () => {
    if (!f.soThe || !f.denNgay) return alert("Nhập số thẻ & ngày hết hạn");
    setLoading(true);
    try {
      // API mới: /patients/:maBenhNhan/bhyt  → trả { bhyt: card }
      const { data } = await client.post(`/patients/${p.maBenhNhan}/bhyt`, f);

      // lưu trạng thái BHYT để màn menu hiển thị đúng
      const card = data?.bhyt || null;
      const valid = !!card && card.trangThai === 1 &&
        String(card.denNgay).slice(0, 10) >= new Date().toISOString().slice(0, 10);

      sessionStorage.setItem("HAS_VALID_BHYT", valid ? "1" : "0");
      if (valid) sessionStorage.setItem("CURRENT_BHYT", JSON.stringify(card));
      else sessionStorage.removeItem("CURRENT_BHYT");

      nav("/menu");
    } catch (e) {
      alert(e?.response?.data?.message || "Không thể tạo BHYT");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
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
              placeholder="VD: BH1234567890"
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
