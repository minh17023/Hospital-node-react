import { useEffect, useRef, useState } from "react";
import s from "./CccdPad.module.css";

export default function CccdPad({ onClose, onSubmit, value = "" }) {
  const [num, setNum] = useState(value);
  const numRef = useRef(value);

  const setNumAndRef = (updater) => {
    setNum(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      numRef.current = next;
      return next;
    });
  };

  const push = (d) => setNumAndRef(x => (x + d).slice(0, 12));
  const clear = () => setNumAndRef("");
  const backspace = () => setNumAndRef(x => x.slice(0, -1));
  const ok = () => onSubmit?.(numRef.current);

  // keyboard: 0–9, Backspace, Delete, Enter, Esc
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;

      if (/^[0-9]$/.test(e.key))      { e.preventDefault(); push(e.key); }
      else if (/^Numpad[0-9]$/.test(e.code)) { e.preventDefault(); push(e.code.replace("Numpad","")); }
      else if (e.key === "Backspace") { e.preventDefault(); backspace(); }
      else if (e.key === "Delete")    { e.preventDefault(); clear(); }
      else if (e.key === "Enter")     { e.preventDefault(); ok(); }
      else if (e.key === "Escape")    { e.preventDefault(); onClose?.(); }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose, onSubmit]);

  // lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className={s.backdrop} role="dialog" aria-modal="true">
      <div className={s.modal}>
        <button className={s.close} aria-label="Đóng" onClick={onClose}>×</button>

        <h5 className={s.title}>Nhập số</h5>
        <div className={s.screen}>{num}</div>

        <div className={s.grid}>
          {"123456789".split("").map(d => (
            <button key={d} className={`${s.key} ${s.blue}`} onClick={() => push(d)}>{d}</button>
          ))}
          <button className={`${s.key} ${s.red}`} onClick={clear}>C</button>
          <button className={`${s.key} ${s.blue}`} onClick={() => push("0")}>0</button>
          <button className={`${s.key} ${s.yellow}`} onClick={ok}>
            <span className={s.icon}>⏎</span> {/* bạn có thể đổi thành "OK" */}
          </button>
        </div>

        <div className={s.footer}>
          <button className={s.btnGhost} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
