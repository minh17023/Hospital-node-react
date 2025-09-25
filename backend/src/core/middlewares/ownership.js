import { ROLES, STAFF } from "../auth/roles.js";

export function patientSelfOrStaff(paramName = "idBenhNhan") {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Staff (DOCTOR/ADMIN) => bỏ qua check
    if (STAFF.includes(req.user.role)) return next();

    // Chỉ bệnh nhân
    const isPatient = req.user.role === ROLES.PATIENT || req.user.kind === "PATIENT";
    if (!isPatient) return res.status(403).json({ message: "Forbidden" });

    const me = Number(req.user.idBenhNhan || 0);
    if (!me) return res.status(401).json({ message: "Không có idBenhNhan trong token" });

    // Lấy id từ params -> body -> query
    let id =
      req.params?.[paramName] ??
      req.body?.[paramName] ??
      req.query?.[paramName];

    id = Number(id || 0);

    // Nếu client không truyền id => tự gán id của chính họ rồi cho qua
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
