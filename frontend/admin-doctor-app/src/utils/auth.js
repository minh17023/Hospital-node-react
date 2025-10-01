const KEY = "ADMIN_DOCTOR_AUTH";

// map số vaiTro từ BE sang role chữ
export function mapRoleFromVaiTro(v) {
  switch (Number(v)) {
    case 1: return "ADMIN";
    case 2: return "DOCTOR";
    default: return "UNKNOWN";
  }
}

// chuẩn hoá payload từ BE -> format nội bộ
export function normalizeAuthFromServer(payload = {}) {
  const token = payload.accessToken || payload.token || "";
  const refreshToken = payload.refreshToken || payload.refresh_token || "";

  const u = payload.user || {};
  return {
    token,
    refreshToken,
    user: {
      id: u.idUser ?? u.id ?? u.userId ?? null,
      username: u.tenDangNhap ?? u.username ?? "",
      name: u.hoTen ?? u.name ?? "",
      role: u.role ? String(u.role).toUpperCase() : mapRoleFromVaiTro(u.vaiTro),
      raw: u, // giữ lại nếu cần dùng thêm
    },
    raw: payload, // giữ bản gốc để debug
  };
}

export function saveAuth(payloadFromServer) {
  const normalized = normalizeAuthFromServer(payloadFromServer);
  localStorage.setItem(KEY, JSON.stringify(normalized));
}

export function getAuth() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function getToken() {
  const a = getAuth();
  // hỗ trợ cả các khoá cũ để không vỡ backward-compat
  return a?.token || a?.accessToken || "";
}

export function getRole() {
  const a = getAuth();
  // ưu tiên role đã chuẩn hoá, fallback từ vaiTro nếu có
  const role = a?.user?.role || mapRoleFromVaiTro(a?.user?.raw?.vaiTro);
  return (role || "").toUpperCase();
}

export function logout() {
  localStorage.removeItem(KEY);
  window.location.href = "/login/doctor";
}
