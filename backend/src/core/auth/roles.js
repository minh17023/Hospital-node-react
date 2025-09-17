// roles.js
export const ROLES = {
  ADMIN: 1,
  DOCTOR: 2,
  PATIENT: 3,          // GIỮ đồng nhất = 3
};

// nhóm staff cho guard
export const STAFF = [ROLES.ADMIN, ROLES.DOCTOR];

// Nếu nơi khác có import hàm này, export luôn để khỏi lỗi
export function mapRoleFromNumber(n) {
  const x = Number(n);
  return [ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT].includes(x) ? x : null;
}
