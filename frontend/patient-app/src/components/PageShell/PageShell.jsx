import { useLayoutEffect, useRef } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import s from "./PageShell.module.css";

export default function PageShell({ children, title, showBack = false }) {
  const shellRef = useRef(null);
  const hdrRef = useRef(null);
  const ftrRef = useRef(null);

  // Đo chiều cao header/footer -> set CSS vars --hdr/--ftr
  useLayoutEffect(() => {
    const apply = () => {
      const h = hdrRef.current?.offsetHeight || 0;
      const f = ftrRef.current?.offsetHeight || 0;
      const el = shellRef.current;
      if (el) {
        el.style.setProperty("--hdr", `${h}px`);
        el.style.setProperty("--ftr", `${f}px`);
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    if (hdrRef.current) ro.observe(hdrRef.current);
    if (ftrRef.current) ro.observe(ftrRef.current);
    window.addEventListener("resize", apply);
    return () => { ro.disconnect(); window.removeEventListener("resize", apply); };
  }, []);

  return (
    <div ref={shellRef} className={s.shell}>
      <div ref={hdrRef} className={s.header}>
        <Header title={title} showBack={showBack} />
      </div>

      {/* phần này sẽ cuộn */}
      <main className={s.main}>
        {children}
      </main>

      <div ref={ftrRef} className={s.footer}>
        <Footer />
      </div>
    </div>
  );
}
