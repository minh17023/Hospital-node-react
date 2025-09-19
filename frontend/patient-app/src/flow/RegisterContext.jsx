import { createContext, useContext, useMemo, useReducer } from "react";

const Ctx = createContext(null);
const init = {
  mode: "bhyt",
  patient: null,
  service: null,
  slot: null,
  priceInfo: { total: 0, note: "", deposit: 0 },
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_MODE": return { ...state, mode: action.mode };
    case "SET_PATIENT": return { ...state, patient: action.data };
    case "SET_SERVICE": return { ...state, service: action.data };
    case "SET_SLOT": return { ...state, slot: action.slot };
    case "SET_PRICE": return { ...state, priceInfo: action.priceInfo };
    case "RESET": return init;
    default: return state;
  }
}

export function RegisterProvider({ children, initialMode }) {
  const [state, dispatch] = useReducer(reducer, { ...init, mode: initialMode });
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useRegister = () => useContext(Ctx);
