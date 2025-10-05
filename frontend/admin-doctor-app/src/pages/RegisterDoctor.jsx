import { useEffect, useState } from "react";
import client from "../api/client";
import { setAuth, ROLES } from "../utils/auth";

export default function RegisterDoctor() {
  const [form, setForm] = useState({
    tenDangNhap: "", matKhau: "", rePass: "",
    hoTen: "", soDienThoai: "", email: "",
    maChuyenKhoa: ""
  });
  const [specs, setSpecs] = useState([]);     // chuyên khoa (nếu backend có API)
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Thử fetch danh sách chuyên khoa nếu có (đặt đúng URL của bạn)
  useEffect(() => {
    (async () => {
      try {
        const rs = await client.get("/chuyenkhoa"); // đổi nếu API khác
        const items = rs?.data?.items || rs?.data || [];
        setSpecs(items);
      } catch {
        // không có endpoint -> dùng input thủ công
      }
    })();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.tenDangNhap || !form.matKhau || !form.hoTen || !form.maChuyenKhoa) {
      setErr("Vui lòng nhập đủ Tên đăng nhập, Mật khẩu, Họ tên, Chuyên khoa.");
      return;
    }
    if (form.matKhau !== form.rePass) {
      setErr("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tenDangNhap: form.tenDangNhap.trim(),
        matKhau: form.matKhau,
        hoTen: form.hoTen.trim(),
        soDienThoai: form.soDienThoai || null,
        email: form.email || null,
        maChuyenKhoa: form.maChuyenKhoa,   // ✔ bắt buộc theo backend
      };

      const { data } = await client.post("/auth/doctor/register", payload);
      // data: { accessToken, refreshToken, user: { maUser, hoTen, vaiTro } }
      setAuth(data);
      window.location.href = "/doctor";
    } catch (e) {
      setErr(e?.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="card-title mb-3">Đăng ký Bác sĩ</h4>

              <form onSubmit={submit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Tên đăng nhập *</label>
                    <input name="tenDangNhap" className="form-control"
                           value={form.tenDangNhap} onChange={onChange} autoFocus />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Họ và tên *</label>
                    <input name="hoTen" className="form-control"
                           value={form.hoTen} onChange={onChange} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Mật khẩu *</label>
                    <input type="password" name="matKhau" className="form-control"
                           value={form.matKhau} onChange={onChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nhập lại mật khẩu *</label>
                    <input type="password" name="rePass" className="form-control"
                           value={form.rePass} onChange={onChange} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Số điện thoại</label>
                    <input name="soDienThoai" className="form-control"
                           value={form.soDienThoai} onChange={onChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" name="email" className="form-control"
                           value={form.email} onChange={onChange} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Chuyên khoa *</label>
                    {specs.length > 0 ? (
                      <select name="maChuyenKhoa" className="form-select"
                              value={form.maChuyenKhoa} onChange={onChange}>
                        <option value="">-- chọn chuyên khoa --</option>
                        {specs.map(sp => (
                          <option key={sp.maChuyenKhoa || sp.id}
                                  value={sp.maChuyenKhoa || sp.id}>
                            {sp.tenChuyenKhoa || sp.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input name="maChuyenKhoa" className="form-control"
                             placeholder="Nhập mã chuyên khoa (VD: 101)"
                             value={form.maChuyenKhoa} onChange={onChange} />
                    )}
                  </div>
                </div>

                {err && <div className="alert alert-danger mt-3 py-2">{err}</div>}

                <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading}>
                  {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
                </button>
              </form>

              <div className="text-center mt-3">
                <a href="/login">Đã có tài khoản? Đăng nhập</a>
              </div>
              <div className="form-text mt-2">Dấu * là bắt buộc</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
