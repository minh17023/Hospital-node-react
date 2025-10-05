import { createContext, useCallback, useContext, useState } from "react";

const AlertCtx = createContext(null);
export const useAlert = () => useContext(AlertCtx);

/**
 * AlertProvider: hiển thị các alert Bootstrap ở top-center, auto-dismiss.
 * Dùng: const { show } = useAlert(); show('success','Đã lưu!');
 */
export default function AlertProvider({ children }) {
  const [list, setList] = useState([]);

  const show = useCallback((variant = "info", message = "", timeout = 3000) => {
    const id = Date.now() + Math.random();
    setList((prev) => [...prev, { id, variant, message }]);
    if (timeout) {
      setTimeout(() => {
        setList((prev) => prev.filter((a) => a.id !== id));
      }, timeout);
    }
  }, []);

  const close = (id) => setList((prev) => prev.filter((a) => a.id !== id));

  return (
    <AlertCtx.Provider value={{ show }}>
      {children}

      {/* vùng hiển thị alert: top-center */}
      <div
        className="position-fixed top-0 start-50 translate-middle-x pt-3"
        style={{ zIndex: 1080, width: "min(480px, 92vw)" }}
      >
        {list.map((a) => (
          <div
            key={a.id}
            className={`alert alert-${a.variant} alert-dismissible fade show shadow`}
            role="alert"
          >
            {a.message}
            <button
              type="button"
              className="btn-close"
              onClick={() => close(a.id)}
              aria-label="Close"
            ></button>
          </div>
        ))}
      </div>
    </AlertCtx.Provider>
  );
}
