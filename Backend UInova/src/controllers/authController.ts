// src/controllers/authController.ts

import { Request, Response } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../utils/prisma";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";

/** =========================
 *  Configuration / Constantes
 *  ========================= */
const REFRESH_COOKIE = "uinova_rt";
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 30);
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // ex: .uinova.com
const COOKIE_SECURE = (process.env.NODE_ENV === "production");

/** =========================
 *  Validation
 *  ========================= */
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(80).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** =========================
 *  Helpers
 *  ========================= */
function addDays(d: Date, days: number) {
  const t = new Date(d);
  t.setDate(t.getDate() + days);
  return t;
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    domain: COOKIE_DOMAIN,
    expires: expiresAt,
    path: "/",
  });
}

async function issueSession(res: Response, user: { id: string; email: string; role: string }) {
  // 1) Access token (JWT court)
  const accessToken = signToken({ sub: user.id, email: user.email, role: user.role });

  // 2) Refresh token (opaque en base, rotation à chaque refresh)
  const rt = crypto.randomBytes(48).toString("hex");
  const expiresAt = addDays(new Date(), REFRESH_DAYS);
  await prisma.refreshToken.create({
    data: { token: rt, userId: user.id, expiresAt },
  });

  // 3) Cookie httpOnly
  setRefreshCookie(res, rt, expiresAt);

  return {
    accessToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

/** =========================
 *  Controllers
 *  ========================= */

/**
 * POST /api/auth/register
 * Body: { email, password, displayName? }
 * Resp: { accessToken, user }
 */
export const register = async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  const { email, password, displayName } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "User already exists" });

  const passwordHash = await hashPassword(password);
  const newUser = await prisma.user.create({
    data: { email, passwordHash, displayName: displayName ?? null, role: "USER" },
    select: { id: true, email: true, role: true },
  });

  const session = await issueSession(res, newUser);
  return res.status(201).json(session);
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Resp: { accessToken, user }
 */
export const login = async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // compat si le champ s'appelle `password` dans ta DB (peu probable)
  const hash = (user as any).passwordHash ?? (user as any).password;
  if (!hash || !(await comparePassword(password, hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const session = await issueSession(res, { id: user.id, email: user.email, role: user.role });
  return res.json(session);
};

/**
 * POST /api/auth/refresh
 * Cookie: uinova_rt
 * Resp: { accessToken, user }
 */
export const refresh = async (req: Request, res: Response) => {
  const rt = req.cookies?.[REFRESH_COOKIE];
  if (!rt) return res.status(401).json({ error: "Missing refresh token" });

  // Lookup refresh token en base
  const stored = await prisma.refreshToken.findUnique({ where: { token: rt } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    // cookie invalide → clear
    res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  // Rotation : révoquer l’ancien, émettre un nouveau
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
    return res.status(401).json({ error: "User not found" });
  }

  const session = await issueSession(res, user);
  return res.json(session);
};

/**
 * POST /api/auth/logout
 * Révoque le refresh courant et efface le cookie
 */
export const logout = async (req: Request, res: Response) => {
  const rt = req.cookies?.[REFRESH_COOKIE];
  if (rt) {
    await prisma.refreshToken.updateMany({ where: { token: rt, revoked: false }, data: { revoked: true } });
  }
  res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
  return res.json({ ok: true });
};

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <accessToken>
 * Resp: { id, email, role }
 */
export const me = async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.sub || req.user?.id; // selon ton middleware
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, displayName: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(user);
};
