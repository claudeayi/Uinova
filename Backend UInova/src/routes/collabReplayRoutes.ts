// src/routes/collabReplay.ts
import express, { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, authorize } from "../middlewares/security";

const router = express.Router();

/* ============================================================================
 *  GET /api/collab/replay/:projectId
 *  Rejoue l’historique collaboratif et renvoie l’état final + steps
 *  Query params :
 *    - limit: nombre max d’entrées (défaut 500, max 5000)
 *    - until: timestamp limite (ISO)
 *    - offset: pour pagination
 * ========================================================================== */
router.get("/:projectId", authenticate, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  if (!projectId) {
    return res.status(400).json({ success: false, message: "❌ Missing projectId" });
  }

  const limit = Math.min(parseInt((req.query.limit as string) || "500", 10), 5000);
  const offset = parseInt((req.query.offset as string) || "0", 10);
  const until = req.query.until ? new Date(req.query.until as string) : null;

  try {
    const history = await prisma.collabHistory.findMany({
      where: {
        projectId: String(projectId),
        ...(until ? { createdAt: { lte: until } } : {}),
      },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
    });

    if (!history || history.length === 0) {
      return res.json({
        success: true,
        projectId,
        steps: [],
        finalState: {},
        meta: { count: 0, limit, offset },
      });
    }

    let finalState: Record<string, any> = {};
    const steps: any[] = [];

    for (const entry of history) {
      try {
        const changes = typeof entry.changes === "string" ? JSON.parse(entry.changes) : entry.changes;
        finalState = { ...finalState, ...changes };

        steps.push({
          userId: entry.userId,
          at: entry.createdAt,
          changes,
          snapshot: { ...finalState },
        });
      } catch (parseErr) {
        console.warn("⚠️ Invalid changes JSON, skipped:", parseErr);
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "COLLAB_REPLAY",
        userId: (req as any).user?.id || null,
        details: `Replay project ${projectId}, steps=${steps.length}, until=${until || "∞"}`,
      },
    });

    res.json({
      success: true,
      projectId,
      meta: { count: steps.length, limit, offset, until },
      steps,
      finalState,
    });
  } catch (err: any) {
    console.error("❌ [Collab] Replay error:", err);

    await prisma.auditLog.create({
      data: {
        action: "COLLAB_REPLAY_ERROR",
        userId: (req as any).user?.id || null,
        details: `Replay error project ${projectId}: ${err.message}`,
      },
    });

    res.status(500).json({ success: false, message: "Failed to replay history" });
  }
});

/* ============================================================================
 *  POST /api/collab/replay/:projectId/snapshot
 *  Sauvegarde un snapshot complet du CRDT (checkpoint).
 * ========================================================================== */
router.post(
  "/:projectId/snapshot",
  authenticate,
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const state = req.body?.state;

    if (!projectId || !state) {
      return res.status(400).json({ success: false, message: "❌ Missing projectId or state" });
    }

    try {
      const snapshot = await prisma.collabSnapshot.create({
        data: {
          projectId: String(projectId),
          state: typeof state === "string" ? JSON.parse(state) : state,
          createdBy: (req as any).user?.id || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "COLLAB_SNAPSHOT_CREATED",
          userId: (req as any).user?.id || null,
          details: `Snapshot created for project ${projectId}, snapshotId=${snapshot.id}`,
        },
      });

      res.status(201).json({ success: true, snapshot });
    } catch (err: any) {
      console.error("❌ [Collab] Snapshot error:", err);

      await prisma.auditLog.create({
        data: {
          action: "COLLAB_SNAPSHOT_ERROR",
          userId: (req as any).user?.id || null,
          details: `Snapshot error project ${projectId}: ${err.message}`,
        },
      });

      res.status(500).json({ success: false, message: "Failed to create snapshot" });
    }
  }
);

/* ============================================================================
 *  DELETE /api/collab/replay/:projectId
 *  Purge l’historique collaboratif d’un projet (admin only)
 *  Query: ?force=true (sinon prévisualisation du nombre d’entrées supprimées)
 * ========================================================================== */
router.delete(
  "/:projectId",
  authenticate,
  authorize(["admin"]),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const force = req.query.force === "true";

    if (!projectId) {
      return res.status(400).json({ success: false, message: "❌ Missing projectId" });
    }

    try {
      const count = await prisma.collabHistory.count({ where: { projectId: String(projectId) } });
      if (!force) {
        return res.json({
          success: true,
          message: `⚠️ ${count} entrées seraient supprimées. Ajoutez ?force=true pour confirmer.`,
          count,
        });
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

      await prisma.auditLog.create({
        data: {
          action: "COLLAB_REPLAY_PURGE_ERROR",
          userId: (req as any).user?.id || null,
          details: `Purge error project ${projectId}: ${err.message}`,
        },
      });

      res.status(500).json({ success: false, message: "Failed to purge history" });
    }
  }
);

export default router;
