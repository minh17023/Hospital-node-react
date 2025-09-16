export default function Summary({ patient, onPrint, onDone }) {
    return (
      <div className="card">
        <h2 className="center">Thông Tin Bệnh Nhân</h2>
        <div className="summary">
          <div><b>Số CCCD</b><span>{patient?.soCCCD}</span></div>
          <div><b>Họ và tên</b><span>{patient?.hoTen}</span></div>
          <div><b>Ngày sinh</b><span>{patient?.ngaySinh}</span></div>
          <div><b>Giới tính</b><span>{patient?.gioiTinh === "M" ? "Nam" : "Nữ"}</span></div>
          <div><b>Số điện thoại</b><span>{patient?.soDienThoai || "-"}</span></div>
          <div><b>Địa chỉ</b><span>{patient?.diaChi || "-"}</span></div>
        </div>
        <div className="center mt">
          <button className="btn" onClick={onDone}>Tiếp tục</button>
          <button className="btn primary" onClick={onPrint} style={{ marginLeft: 12 }}>In phiếu</button>
        </div>
      </div>
    );
  }
  