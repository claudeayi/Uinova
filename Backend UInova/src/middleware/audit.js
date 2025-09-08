// src/middlewares/auditLog.ts
import { prisma } from "../utils/prisma";
import type { Request, Response, NextFunction } from "express";

const SENSITIVE_KEYS = ["password", "token", "authorization"];

function sanitize(obj: any) {
  if (!obj || typeof obj !== "object") return obj;
  const clone: any = {};
  for (const k of Object.keys(obj)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
      clone[k] = "***";
    } else {
      clone[k] = obj[k];
    }
  }
  return clone;
}

export async function auditLog(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", async () => {
    try {
      if (process.env.AUDIT_LOG_ENABLED === "false") return;

      const userId = (req as any)?.user?.id || null;
      const action = `${req.method} ${req.originalUrl}`;
      const latencyMs = Date.now() - start;

      const metadata: Record<string, any> = {
        statusCode: res.statusCode,
        ip: req.ip,
        ua: req.headers["user-agent"] || null,
        latencyMs,
      };

      if (process.env.AUDIT_LOG_VERBOSE === "true") {
        metadata.query = sanitize(req.query);
        metadata.body = sanitize(req.body);
        metadata.params = sanitize(req.params);
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action,
          metadata,
        },
      });
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("❌ Audit log error:", err.message);
      }
    }
  });

  next();
}
