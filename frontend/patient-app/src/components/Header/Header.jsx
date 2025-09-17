import { useNavigate } from "react-router-dom";
import s from "./Header.module.css";

export default function Header({ showBack=false, title="Hệ Thống Đăng Ký Khám Bệnh" }) {
  const nav = useNavigate();
  return (
    <header className={s.header}>
      <div className={s.wrap}>
        <div>
          {showBack
            ? <button className={s.btnBack} onClick={()=>nav(-1)}>← Quay lại</button>
            : <div className={s.brand} onClick={()=>nav("/")}>🏥 <span>Hệ Thống Y Tế</span></div>}
        </div>
        <h1 className={s.title}>{title}</h1>
        <small>v1.0.0</small>
      </div>
    </header>
  );
}
