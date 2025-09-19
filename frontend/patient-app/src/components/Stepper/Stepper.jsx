import s from "./Stepper.module.css";

export default function Stepper({ step = 1, className = "" }) {
  const items = [
    { no: 1, label: "Thông Tin Bệnh Nhân" },
    { no: 2, label: "Chọn Dịch Vụ" },
    { no: 3, label: "In Phiếu Khám" },
  ];

  return (
    <>
      <div className={s.spacer} aria-hidden />
      <nav className={`${s.wrap} ${className}`} aria-label="Các bước quy trình">
        {items.map((it, i) => {
          const state = it.no < step ? "done" : it.no === step ? "active" : "todo";
          const isLast = i === items.length - 1;
          return (
            <div key={it.no} className={`${s.step} ${s[state]}`} aria-current={it.no === step ? "step" : undefined}>
              <div className={s.circle}>{it.no < step ? <span className={s.tick}>✓</span> : it.no}</div>
              <div className={s.texts}>
                <div className={s.caption}>Bước {it.no}</div>
                <div className={s.label}>{it.label}</div>
              </div>
              {!isLast && <div className={`${s.line} ${s[state]}`} />}
            </div>
          );
        })}
      </nav>
    </>
  );
}
