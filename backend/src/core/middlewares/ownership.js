import { ROLES, STAFF } from "../auth/roles.js";

export function patientSelfOrStaff(paramName = "idBenhNhan") {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Admin/Doctor qua thẳng
    if (STAFF.includes(req.user.role)) return next();

    // Chỉ bệnh nhân mới được đi tiếp
    if (req.user.kind !== "PATIENT" || req.user.role !== ROLES.PATIENT) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const idParam = Number(req.params[paramName]);
    if (idParam && idParam === Number(req.user.idBenhNhan)) return next();

    return res.status(403).json({ message: "Chỉ được thao tác hồ sơ của chính bạn" });
  };
}
