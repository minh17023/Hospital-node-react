import { useState } from "react";

export default function CccdPad({ onClose, onSubmit, value="" }) {
  const [num, setNum] = useState(value);
  const push = (d) => setNum((s) => (s + d).slice(0, 12));
  const clear = () => setNum("");
  return (
    <div className="modal">
      <div className="modal-body">
        <h3>Nhập số</h3>
        <input value={num} readOnly className="pad-input" />
        <div className="grid">
          {"123456789".split("").map((d) =>
            <button key={d} className="btn" onClick={() => push(d)}>{d}</button>
          )}
          <button className="btn danger" onClick={clear}>C</button>
          <button className="btn" onClick={() => push("0")}>0</button>
          <button className="btn warn" onClick={() => onSubmit(num)}>OK</button>
        </div>
        <div className="footer">
          <button className="btn ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
