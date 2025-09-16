export default function Stepper({ step }) {
    const dot = (n, label) => (
      <div className="step">
        <div className={`circle ${step === n ? "active" : step > n ? "done" : ""}`}>{n}</div>
        <div className="text">{label}</div>
      </div>
    );
    return (
      <div className="stepper">
        {dot(1, "Thông Tin Bệnh Nhân")}
        <div className="line" />
        {dot(2, "Chọn Dịch Vụ")}
        <div className="line" />
        {dot(3, "In Phiếu Khám")}
      </div>
    );
  }
  