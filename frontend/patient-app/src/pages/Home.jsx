import { useNavigate } from "react-router-dom";

const Card = ({ icon, title, sub, onClick }) => (
  <div className="select-card" onClick={onClick}>
    <div className="ic">{icon}</div>
    <div>
      <div className="title">{title}</div>
      <div className="sub">{sub}</div>
    </div>
    <div className="chev">›</div>
  </div>
);

export default function Home() {
  const nav = useNavigate();
  return (
    <div className="container">
      <h1>Hệ Thống Đăng Ký Khám Bệnh</h1>
      <p className="subhead">Chọn loại dịch vụ bạn muốn sử dụng</p>
      <div className="grid2 mt">
        <Card icon="💙" title="Khám Bảo Hiểm Y Tế" sub="Đăng ký khám bệnh với thẻ BHYT"
              onClick={() => nav("/offline")} />
        <Card icon="🟩" title="Khám Dịch Vụ" sub="Đăng ký khám dịch vụ không BHYT" onClick={() => nav("/offline")} />
        <Card icon="🟣" title="Đặt Lịch Hẹn" sub="Đăng ký khám theo thời gian" onClick={() => alert("Coming soon")} />
        <Card icon="🟧" title="Tra Cứu Kết Quả" sub="Xem kết quả khám bệnh" onClick={() => alert("Coming soon")} />
      </div>
    </div>
  );
}
