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

      // --- chuẩn hoá ---
      let role = p.role;
      if (typeof role === "string") role = ROLE_NAME_TO_NUM[role] ?? null;

      const user = { ...p, role };

      if (user.kind === "PATIENT") {
        user.idBenhNhan = Number(user.idBenhNhan ?? user.sub);
      } else {
        user.idUser = Number(user.idUser ?? user.sub);
      }

      req.user = user;
      return next();
    } catch (e) {
      if (required) return res.status(401).json({ message: "Invalid/expired token" });
      req.user = null; return next();
    }
  };
}
