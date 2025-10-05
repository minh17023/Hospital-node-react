export const ROLES = {
  ADMIN: 1,
  DOCTOR: 2,
  PATIENT: 3,
};

export const STAFF = [ROLES.ADMIN, ROLES.DOCTOR];

export function mapRoleFromNumber(n) {
  const x = Number(n);
  return [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT].includes(x) ? x : null;
}