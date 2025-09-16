import { Request, Response } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import client from "prom-client";
import { prisma } from "../utils/prisma";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";
import { emitEvent } from "../services/eventBus";
import { logger } from "../utils/logger";

/* ============================================================================
 * CONFIG
 * ========================================================================== */
const REFRESH_COOKIE = "uinova_rt";
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 30);
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SECURE = process.env.NODE_ENV === "production";

/* ============================================================================
 * METRICS Prometheus
 * ========================================================================== */
const counterLoginSuccess = new client.Counter({
  name: "uinova_auth_login_success_total",
  help: "Nombre total de connexions réussies",
});
const counterLoginFail = new client.Counter({
  name: "uinova_auth_login_fail_total",
  help: "Nombre total de connexions échouées",
});
const counterRefresh = new client.Counter({
  name: "uinova_auth_refresh_total",
  help: "Nombre total de refresh token effectués",
});
const counterLogout = new client.Counter({
  name: "uinova_auth_logout_total",
  help: "Nombre total de logout",
});

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(128),
  displayName: z.string().min(2).max(80).optional(),
});

const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(128),
});

/* ============================================================================
 * HELPERS
 * ========================================================================== */
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
  const accessToken = signToken({ sub: user.id, email: user.email, role: user.role });
  const rt = crypto.randomBytes(48).toString("hex");
  const expiresAt = addDays(new Date(), REFRESH_DAYS);

  await prisma.refreshToken.create({
    data: { token: rt, userId: user.id, expiresAt },
  });

  setRefreshCookie(res, rt, expiresAt);

  return {
    accessToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// ✅ Register
export const register = async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const { email, password, displayName } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: "User already exists" });

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: { email, passwordHash, displayName: displayName ?? null, role: "USER" },
      select: { id: true, email: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: "USER_REGISTER",
        metadata: { email, ip: req.ip, ua: req.headers["user-agent"], latency: Date.now() - start },
      },
    });
    emitEvent("auth.register", { userId: newUser.id, email });

    const session = await issueSession(res, newUser);
    return res.status(201).json({ success: true, data: session });
  } catch (e: any) {
    logger.error("❌ register error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ✅ Login
export const login = async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      counterLoginFail.inc();
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      counterLoginFail.inc();
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const hash = (user as any).passwordHash ?? (user as any).password;
    if (!hash || !(await comparePassword(password, hash))) {
      counterLoginFail.inc();
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    counterLoginSuccess.inc();
    await prisma.auditLog.create({
      data: { userId: user.id, action: "USER_LOGIN", metadata: { email, ip: req.ip, ua: req.headers["user-agent"], latency: Date.now() - start } },
    });
    emitEvent("auth.login", { userId: user.id, email });

    const session = await issueSession(res, { id: user.id, email: user.email, role: user.role });
    return res.json({ success: true, data: session });
  } catch (e: any) {
    counterLoginFail.inc();
    logger.error("❌ login error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ✅ Refresh
export const refresh = async (req: Request, res: Response) => {
  try {
    const rt = req.cookies?.[REFRESH_COOKIE];
    if (!rt) return res.status(401).json({ success: false, message: "Missing refresh token" });

    const stored = await prisma.refreshToken.findUnique({ where: { token: rt } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
      return res.status(401).json({ success: false, message: "User not found" });
    }

    counterRefresh.inc();
    await prisma.auditLog.create({
      data: { userId: user.id, action: "TOKEN_REFRESH", metadata: { oldTokenId: stored.id, ip: req.ip } },
    });
    emitEvent("auth.refresh", { userId: user.id });

    const session = await issueSession(res, user);
    return res.json({ success: true, data: session });
  } catch (e: any) {
    logger.error("❌ refresh error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ✅ Logout
export const logout = async (req: Request, res: Response) => {
  try {
    const rt = req.cookies?.[REFRESH_COOKIE];
    if (rt) {
      await prisma.refreshToken.updateMany({ where: { token: rt, revoked: false }, data: { revoked: true } });
    }
    res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
    counterLogout.inc();

    emitEvent("auth.logout", { userId: (req as any).user?.id || "unknown" });
    return res.json({ success: true });
  } catch (e: any) {
    logger.error("❌ logout error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ✅ Logout All
export const logoutAll = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });

    res.clearCookie(REFRESH_COOKIE, { domain: COOKIE_DOMAIN, path: "/" });
    counterLogout.inc();

    emitEvent("auth.logoutAll", { userId });
    return res.json({ success: true, message: "All sessions revoked" });
  } catch (e: any) {
    logger.error("❌ logoutAll error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ✅ Me
export const me = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, displayName: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({ success: true, data: user });
  } catch (e: any) {
    logger.error("❌ me error", e);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
