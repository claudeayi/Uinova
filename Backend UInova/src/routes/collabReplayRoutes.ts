import express, { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, authorize } from "../middlewares/security";

const router = express.Router();

/* ============================================================================
 *  GET /api/collab/replay/:projectId
 *  Rejoue l’historique collaboratif et renvoie l’état final + steps
 *  Query params : ?limit=100&until=timestamp
 * ========================================================================== */
router.get("/:projectId", authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ success: false, message: "❌ Missing projectId" });
    }

    const limit = parseInt((req.query.limit as string) || "500", 10);
    const until = req.query.until ? new Date(req.query.until as string) : null;

    // 🔎 Historique filtré
    const history = await prisma.collabHistory.findMany({
      where: {
        projectId: String(projectId),
        ...(until ? { createdAt: { lte: until } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    if (!history || history.length === 0) {
      return res.json({ success: true, projectId, steps: [], finalState: {} });
    }

    // 🔄 Rejoue les changements (ici simple merge JSON)
    let finalState: Record<string, any> = {};
    const steps: any[] = [];

    for (const entry of history) {
      finalState = {
        ...finalState,
        ...entry.changes,
      };

      steps.push({
        userId: entry.userId,
        at: entry.createdAt,
        changes: entry.changes,
        snapshot: finalState,
      });
    }

    // 📝 Audit
    await prisma.auditLog.create({
      data: {
        action: "COLLAB_REPLAY",
        userId: (req as any).user?.id || null,
        details: `Replay project ${projectId}, steps=${steps.length}`,
      },
    });

    res.json({ success: true, projectId, steps, finalState });
  } catch (err: any) {
    console.error("❌ [Collab] Replay error:", err);
    res.status(500).json({ success: false, message: "Failed to replay history" });
  }
});

/* ============================================================================
 *  DELETE /api/collab/replay/:projectId
 *  Purge l’historique collaboratif d’un projet (admin only)
 * ========================================================================== */
router.delete(
  "/:projectId",
  authenticate,
  authorize(["admin"]),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        return res.status(400).json({ success: false, message: "❌ Missing projectId" });
      }

      const deleted = await prisma.collabHistory.deleteMany({
        where: { projectId: String(projectId) },
      });

      await prisma.auditLog.create({
        data: {
          action: "COLLAB_REPLAY_PURGE",
          userId: (req as any).user?.id || null,
          details: `Purge project ${projectId}, entries=${deleted.count}`,
        },
      });

      res.json({
        success: true,
        message: `✅ Collab history purged for project ${projectId}`,
        deleted: deleted.count,
      });
    } catch (err: any) {
      console.error("❌ [Collab] Purge error:", err);
      res.status(500).json({ success: false, message: "Failed to purge history" });
    }
  }
);

export default router;
