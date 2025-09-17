import s from "./Summary.module.css";
export default function Summary({ patient, onPrint, onDone }) {
  return (
    <div className={`card ${s.wrap}`}>
      <h4 className="text-center mb-3">Thông Tin Bệnh Nhân</h4>
      <div className={s.grid}>
        {[
          ["Số CCCD", patient?.soCCCD],
          ["Họ và tên", patient?.hoTen],
          ["Ngày sinh", patient?.ngaySinh],
          ["Giới tính", patient?.gioiTinh==="M"?"Nam":"Nữ"],
          ["Số điện thoại", patient?.soDienThoai || "-"],
          ["Địa chỉ", patient?.diaChi || "-"],
        ].map(([k,v])=>(
          <div key={k} className={s.row}><b>{k}</b><span>{v}</span></div>
        ))}
      </div>
      <div className={s.actions}>
        <button className="btn btn-outline-secondary" onClick={onDone}>Tiếp tục</button>
        <button className="btn btn-primary" onClick={onPrint}>In phiếu</button>
      </div>
    </div>
  );
}
