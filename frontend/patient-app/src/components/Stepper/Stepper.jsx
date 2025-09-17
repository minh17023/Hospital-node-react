import s from "./Stepper.module.css";
export default function Stepper({ step }) {
  const node = (n, label) => (
    <div className={`${s.step} ${step===n ? s.active : ""}`}>
      <div className={s.circle}>{n}</div>
      <div>{label}</div>
    </div>
  );
  return (
    <div className={s.wrap}>
      {node(1,"Thông Tin Bệnh Nhân")} <div className={s.line} />
      {node(2,"Chọn Dịch Vụ")}      <div className={s.line} />
      {node(3,"In Phiếu Khám")}
    </div>
  );
}
