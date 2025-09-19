import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RegisterProvider, useRegister } from "../../flow/RegisterContext";
import { FLOW_MODES } from "../../flow/config";
import Stepper from "../../components/Stepper/Stepper";
import PatientStep from "./steps/PatientStep";
import ServiceStep from "./steps/ServiceStep";
import PrintStep from "./steps/PrintStep";

function FlowInner() {
  const { mode } = useParams();
  const nav = useNavigate();
  const { dispatch } = useRegister();
  const cfg = FLOW_MODES[mode];

  useEffect(() => {
    if (!cfg) return nav("/");
    dispatch({ type: "SET_MODE", mode });
    if (cfg.requiresBhytValid && sessionStorage.getItem("HAS_VALID_BHYT") !== "1") {
      nav("/"); // hoặc toast cảnh báo
    }
  }, [mode]);

  const steps = [
    { title: "Thông Tin Bệnh Nhân", element: <PatientStep /> },
    { title: "Chọn Dịch Vụ", element: <ServiceStep cfg={cfg} /> },
    { title: "In Phiếu Khám", element: <PrintStep cfg={cfg} /> },
  ];

  return (
    <div className="page-band container">
      <h1 className="text-center mb-4">{cfg?.title || "Đăng ký khám"}</h1>
      <Stepper steps={steps} />
    </div>
  );
}

export default function FlowPageWrapper() {
  const { mode } = useParams();
  return (
    <RegisterProvider initialMode={mode}>
      <FlowInner />
    </RegisterProvider>
  );
}
