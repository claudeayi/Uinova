import bcrypt from "bcryptjs";

export function hashPassword(pwd: string) {
  return bcrypt.hashSync(pwd, 10);
}

export function comparePassword(pwd: string, hash: string) {
  return bcrypt.compareSync(pwd, hash);
}
