import { prisma } from "../utils/prisma.js";

export async function auditLog(req, res, next) {
  res.on("finish", async () => {
    try {
      const userId = req.user?.id || null;
      const action = `${req.method} ${req.originalUrl}`;
      const metadata = { statusCode: res.statusCode };

      await prisma.auditLog.create({
        data: { userId, action, metadata }
      });
    } catch (err) {
      console.error("Audit log error:", err.message);
    }
  });

  next();
}
