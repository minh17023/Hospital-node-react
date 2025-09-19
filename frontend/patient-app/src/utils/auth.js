export const getPatient = () => {
  const raw = localStorage.getItem("PATIENT_INFO") || sessionStorage.getItem("PATIENT_INFO");
  return raw ? JSON.parse(raw) : null;
};

export const getPatientToken = () =>
  localStorage.getItem("PATIENT_TOKEN") || sessionStorage.getItem("PATIENT_TOKEN");

export const logoutPatient = () => {
  // các key bạn đang dùng – thêm/bớt theo app
  [
    "PATIENT_INFO",
    "PATIENT_TOKEN",
    "HAS_VALID_BHYT",
    "CURRENT_BHYT",
    "SKIP_BHYT",
    "PENDING_CCCD",
    "SELECTED_SERVICE"
  ].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
};