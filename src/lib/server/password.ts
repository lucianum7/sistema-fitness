import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const rounds = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, rounds);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}
