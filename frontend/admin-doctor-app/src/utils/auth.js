export const ROLES = { ADMIN: "ADMIN", DOCTOR: "DOCTOR" };

// map vaiTro (1=ADMIN, 2=DOCTOR) => tên role FE
export function roleFromVaiTro(v) {
  return Number(v) === 1 ? ROLES.ADMIN : ROLES.DOCTOR;
}

export function setAuth({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem("ACCESS_TOKEN", accessToken);
  if (refreshToken) localStorage.setItem("REFRESH_TOKEN", refreshToken);
  if (user) {
    const me = {
      maUser: user.maUser,
      tenDangNhap: user.tenDangNhap,
      hoTen: user.hoTen,
      vaiTro: user.vaiTro,
      role: roleFromVaiTro(user.vaiTro),
    };
    localStorage.setItem("ME", JSON.stringify(me));
  }
}

export function clearAuth() {
  localStorage.removeItem("ACCESS_TOKEN");
  localStorage.removeItem("REFRESH_TOKEN");
  localStorage.removeItem("ME");
}

export function getMe() {
  try { return JSON.parse(localStorage.getItem("ME") || "null"); }
  catch { return null; }
}

export function hasRole(...roles) {
  const me = getMe();
  if (!me) return false;
  return roles.includes(me.role);
}
