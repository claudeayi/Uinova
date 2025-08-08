import { randomBytes } from "crypto";

export function generateId(length = 16) {
  return randomBytes(length).toString("hex");
}

export function generateShortCode(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}
