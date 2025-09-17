import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { ROLES } from "../auth/roles.js";

const issuer = "hospital-erp";
const audience = "hospital-erp-clients";

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.idUser),
      role: user.vaiTro ?? user.role,        
      username: user.tenDangNhap,
      kind: "USER",
      idUser: user.idUser,                  
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expires, issuer, audience }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user.idUser), kind: "USER" },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpires, issuer, audience }
  );
}

export function signPatientAccessToken(patient) {
  return jwt.sign({
    sub: String(patient.idBenhNhan),
    idBenhNhan: Number(patient.idBenhNhan),
    role: ROLES.PATIENT,   
    kind: "PATIENT",
    cccd: patient.soCCCD,
  }, 
  env.jwt.secret, 
  { expiresIn: env.jwt.expires, issuer, audience });
}

export function signPatientRefreshToken(patient) {
  return jwt.sign(
    { sub: String(patient.idBenhNhan), kind: "PATIENT" },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpires, issuer, audience }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret, { issuer, audience });
}
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret, { issuer, audience });
}
