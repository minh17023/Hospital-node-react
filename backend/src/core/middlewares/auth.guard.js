import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export function authGuard(required = true) {
  return (req, res, next) => {
    try {
      const hdr = req.headers.authorization || "";
      const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

      if (!token) {
        if (required) return res.status(401).json({ message: "Missing token" });
        req.user = null; return next();
      }
      const payload = jwt.verify(token, env.jwt.secret, {
        issuer: "hospital-erp",
        audience: "hospital-erp-clients"
      });
      req.user = payload; // { sub, role, username?, kind? }
      next();
    } catch (e) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}
