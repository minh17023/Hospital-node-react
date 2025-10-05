import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { ROLES } from "../auth/roles.js";

const issuer = "hospital-erp";
const audience = "hospital-erp-clients";

/** USER TOKEN (ADMIN/DOCTOR) */
export function signAccessToken(user) {
  const maUser = String(user.maUser);  // mã dạng VARCHAR(10)
  return jwt.sign(
    {
      sub: maUser,
      role: user.vaiTro ?? user.role,    // vẫn là số 1/2/3
      username: user.tenDangNhap,
      kind: "USER",
      maUser,                            // kèm theo cho FE/BE đọc nhanh
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expires, issuer, audience }
  );
}

export function signRefreshToken(user) {
  const maUser = String(user.maUser);
  return jwt.sign(
    { sub: maUser, kind: "USER", maUser },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpires, issuer, audience }
  );
}

/** PATIENT TOKEN */
export function signPatientAccessToken(patient) {
  const maBenhNhan = String(patient.maBenhNhan);
  return jwt.sign(
    {
      sub: maBenhNhan,
      maBenhNhan,
      role: ROLES.PATIENT,
      kind: "PATIENT",
      cccd: patient.soCCCD,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expires, issuer, audience }
  );
}

export function signPatientRefreshToken(patient) {
  const maBenhNhan = String(patient.maBenhNhan);
  return jwt.sign(
    { sub: maBenhNhan, kind: "PATIENT", maBenhNhan },
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