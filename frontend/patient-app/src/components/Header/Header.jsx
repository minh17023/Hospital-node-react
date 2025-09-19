// src/components/Header/Header.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import s from "./Header.module.css";

/* Helpers: chỉ dùng trong Header, không cần file mới */
const readAuth = () => {
  try {
    const pRaw =
      localStorage.getItem("PATIENT_INFO") ||
      sessionStorage.getItem("PATIENT_INFO");
    const tRaw =
      localStorage.getItem("PATIENT_TOKEN") ||
      sessionStorage.getItem("PATIENT_TOKEN");
    const p = pRaw ? JSON.parse(pRaw) : null;
    const t = tRaw || null;
    return p && t ? p : null;
  } catch {
    return null;
  }
};
const clearAuth = () => {
  ["PATIENT_INFO","PATIENT_TOKEN","HAS_VALID_BHYT","CURRENT_BHYT","SKIP_BHYT","PENDING_CCCD"]
    .forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
};

export default function Header({
  showBack = false,
  title = "Hệ Thống Đăng Ký Khám Bệnh",
  hideAuth = true, // luôn ẩn nút "Đăng nhập"
}) {
  const nav = useNavigate();
  const location = useLocation(); // 👈 BẮT thay đổi route
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // đọc auth khi mount
  useEffect(() => { setUser(readAuth()); }, []);

  // ⛳️ CẬP NHẬT user MỖI KHI ROUTE ĐỔI (không cần sửa trang login)
  useEffect(() => {
    setUser(readAuth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]); // đổi đường dẫn → đọc lại

  // Dự phòng: khi tab focus/visible trở lại cũng đồng bộ
  useEffect(() => {
    const refresh = () => setUser(readAuth());
    window.addEventListener("focus", refresh);
    window.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // đóng dropdown khi click ra ngoài
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const displayName =
    user?.hoTen?.trim() || user?.tenBenhNhan || user?.username || "Khách";

  const goBackOrHome = () => (showBack ? nav(-1) : nav("/"));
  const gotoProfile = () => { setOpen(false); nav("/profile"); };
  const doLogout = () => { setOpen(false); clearAuth(); setUser(null); nav("/", { replace: true }); };

  return (
    <header className={s.header}>
      <div className={s.wrap}>
        <div className={s.left}>
          {showBack ? (
            <button className={s.btnBack} onClick={goBackOrHome}>← Quay lại</button>
          ) : (
            <button className={s.brand} onClick={goBackOrHome}>🏥 <span>Hệ Thống Y Tế</span></button>
          )}
        </div>

        <h1 className={s.title}>{title}</h1>

        <div className={s.right} ref={menuRef}>
          {user ? (
            <>
              <button className={s.userBtn} onClick={() => setOpen(v => !v)}>
                <div className={s.avatar}>{displayName.slice(0,1).toUpperCase()}</div>
                <div className={s.userText}>
                  <div className={s.name}>{displayName}</div>
                  <div className={s.sub}>Bệnh nhân</div>
                </div>
                <span className={s.caret}>▾</span>
              </button>
              {open && (
                <div className={s.menu} role="menu">
                  <button className={s.item} onClick={gotoProfile}>Hồ sơ bệnh nhân</button>
                  {/* ĐÃ BỎ mục BHYT */}
                  <div className={s.sep} />
                  <button className={`${s.item} ${s.danger}`} onClick={doLogout}>Đăng xuất</button>
                </div>
              )}
            </>
          ) : (
            hideAuth ? null : null  // luôn không hiển thị nút Đăng nhập
          )}
        </div>
      </div>
    </header>
  );
}
