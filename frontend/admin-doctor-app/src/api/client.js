const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080/api/v1";

export default async function client(path, { method = "GET", body, token } = {}) {
  if (!token) {
    try {
      const raw = JSON.parse(localStorage.getItem("ADMIN_DOCTOR_AUTH") || "{}");
      token = raw.token || raw.accessToken || "";
    } catch { token = ""; }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}
