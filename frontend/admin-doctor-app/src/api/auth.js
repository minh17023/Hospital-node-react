import client from "./client";

const toVNLogin = ({ username, password }) => ({
  tenDangNhap: (username || "").trim(),
  matKhau: (password || "").trim(),
});

export const adminLogin  = (p) => client("/auth/admin/login",  { method: "POST", body: toVNLogin(p) });
export const doctorLogin = (p) => client("/auth/doctor/login", { method: "POST", body: toVNLogin(p) });
