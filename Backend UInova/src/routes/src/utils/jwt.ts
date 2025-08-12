// src/utils/jwt.ts
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_me_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Structure typique du payload
 */
export interface JWTPayload extends JwtPayload {
  id: number;
  email: string;
  role: "user" | "premium" | "admin";
}

/**
 * Génère un token JWT signé
 * @param payload Données à encoder
 * @param expiresIn Durée avant expiration (ex: "7d", "1h")
 */
export function signToken(payload: JWTPayload, expiresIn: string = JWT_EXPIRES_IN): string {
  const options: SignOptions = { expiresIn, algorithm: "HS256" };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Vérifie et décode un token JWT
 * @param token Token JWT
 * @returns Payload si valide, sinon null
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Décode un token sans vérifier la signature (à utiliser avec prudence)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
