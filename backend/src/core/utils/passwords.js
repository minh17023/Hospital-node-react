import bcrypt from "bcryptjs";
export const hash = (pwd, rounds = 10) => bcrypt.hash(pwd, rounds);
export const compare = (pwd, hashed) => bcrypt.compare(pwd, hashed);
