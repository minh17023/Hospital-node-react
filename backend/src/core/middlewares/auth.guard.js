import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { ROLES } from "../auth/roles.js";

const ROLE_NAME_TO_NUM = {
  ADMIN: ROLES.ADMIN,
  DOCTOR: ROLES.DOCTOR,
  PATIENT: ROLES.PATIENT,
};

export function authGuard(required = true) {
  return (req, res, next) => {
    try {
      const hdr = req.headers.authorization || "";
      const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
      if (!token) {
        if (required) return res.status(401).json({ message: "Unauthorized" });
        req.user = null; return next();
      }

      const p = jwt.verify(token, env.jwt.secret, {
        issuer: "hospital-erp",
        audience: "hospital-erp-clients",
      });

      // --- Chuẩn hoá role ---
      let role = p.role;
      if (typeof role === "string") role = ROLE_NAME_TO_NUM[role] ?? null;

      // Back-compat: nếu token cũ còn idUser/idBenhNhan dạng số -> chuyển sang mã string
      const maUserFromOld   = p.maUser ;
      const maBNFromOld     = p.maBenhNhan ;

      const user = { ...p, role };

      if (p.kind === "PATIENT") {
        user.kind = "PATIENT";
        user.maBenhNhan = String(maBNFromOld ?? p.sub ?? "");
      } else {
        user.kind = "USER";
        user.maUser = String(maUserFromOld ?? p.sub ?? "");
      }

      req.user = user;
      return next();
    } catch {
      if (required) return res.status(401).json({ message: "Invalid/expired token" });
      req.user = null; return next();
    }
  };
}