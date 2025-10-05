import { ROLES, STAFF } from "../auth/roles.js";

export function patientSelfOrStaff(paramName = "maBenhNhan") {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Staff (DOCTOR/ADMIN) => bỏ qua check
    if (STAFF.includes(req.user.role)) return next();

    // Chỉ bệnh nhân
    const isPatient = req.user.role === ROLES.PATIENT || req.user.kind === "PATIENT";
    if (!isPatient) return res.status(403).json({ message: "Forbidden" });

    const me = String(req.user.maBenhNhan || "");
    if (!me) return res.status(401).json({ message: "Không có maBenhNhan trong token" });

    // Lấy mã từ params -> body -> query
    let id =
      req.params?.[paramName] ??
      req.body?.[paramName] ??
      req.query?.[paramName];

    id = String(id || "");

    // Nếu client không truyền mã => tự gán mã của chính họ rồi cho qua
    if (!id) {
      if (req.body) req.body[paramName] = me;
      if (req.query && req.query[paramName] === undefined) req.query[paramName] = me;
      return next();
    }

    if (id !== me) {
      return res.status(403).json({ message: "Chỉ được thao tác hồ sơ của chính bạn" });
    }
    return next();
  };
}