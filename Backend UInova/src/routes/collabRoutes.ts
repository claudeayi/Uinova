// src/routes/collabHistory.ts
import express, { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, authorize } from "../middlewares/security";

const router = express.Router();

/* ============================================================================
 * GET /api/collab/history/:projectId
 * 📜 Récupère l’historique collaboratif d’un projet (avec pagination + filtre)
 * Query params :
 *   - limit (default: 500, max: 2000)
 *   - offset (default: 0)
 *   - until (ISO timestamp optionnel)
 * ============================================================================
 */
router.get(
  "/history/:projectId",
  authenticate,
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    const limit = Math.min(parseInt((req.query.limit as string) || "500", 10), 2000);
    const offset = parseInt((req.query.offset as string) || "0", 10);
    const until = req.query.until ? new Date(req.query.until as string) : null;

    try {
      const [count, history] = await Promise.all([
        prisma.collabHistory.count({
          where: {
            projectId: String(projectId),
            ...(until ? { createdAt: { lte: until } } : {}),
          },
        }),
        prisma.collabHistory.findMany({
          where: {
            projectId: String(projectId),
            ...(until ? { createdAt: { lte: until } } : {}),
          },
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: "asc" },
          skip: offset,
          take: limit,
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          action: "COLLAB_HISTORY_FETCH",
          userId: (req as any).user?.id || null,
          details: `Fetch history for project ${projectId}, count=${history.length}`,
        },
      });

      res.json({
        success: true,
        projectId,
        meta: { total: count, limit, offset, until },
        data: history,
      });
    } catch (err: any) {
      console.error("❌ [Collab] Error fetching history:", err);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  }
);

/* ============================================================================
 * DELETE /api/collab/history/:projectId
 * 🗑️ Vide l’historique d’un projet (admin only, preview avec ?force=true)
 * ============================================================================
 */
router.delete(
  "/history/:projectId",
  authenticate,
  authorize(["admin"]),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    const force = req.query.force === "true";

    try {
      const count = await prisma.collabHistory.count({ where: { projectId: String(projectId) } });

      if (!force) {
        return res.json({
          success: true,
          message: `⚠️ ${count} entrées seraient supprimées. Ajoutez ?force=true pour confirmer.`,
          count,
        });
      }

      const deleted = await prisma.collabHistory.deleteMany({ where: { projectId: String(projectId) } });

      await prisma.auditLog.create({
        data: {
          action: "COLLAB_HISTORY_PURGE",
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
      console.error("❌ [Collab] Error deleting history:", err);
      res.status(500).json({ error: "Failed to delete history" });
    }
  }
);

/* ============================================================================
 * POST /api/collab/history/:projectId/restore
 * ♻️ Restaure un projet à partir de son historique (replay complet)
 * ============================================================================
 */
router.post(
  "/history/:projectId/restore",
  authenticate,
  authorize(["admin"]),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    try {
      const history = await prisma.collabHistory.findMany({
        where: { projectId: String(projectId) },
        orderBy: { createdAt: "asc" },
      });

      if (!history || history.length === 0) {
        return res.status(404).json({ success: false, message: "No history found for project" });
      }

      // 🔄 Rejoue les steps → construit un snapshot final
      let finalState: Record<string, any> = {};
      for (const entry of history) {
        finalState = { ...finalState, ...entry.changes };
      }

      // Met à jour le projet avec ce snapshot
      const updatedProject = await prisma.project.update({
        where: { id: String(projectId) },
        data: { schema: finalState },
      });

      await prisma.auditLog.create({
        data: {
          action: "COLLAB_HISTORY_RESTORE",
          userId: (req as any).user?.id || null,
          details: `Restore project ${projectId} with ${history.length} steps`,
        },
      });

      res.json({
        success: true,
        projectId,
        restored: true,
        steps: history.length,
        finalState,
        project: updatedProject,
      });
    } catch (err: any) {
      console.error("❌ [Collab] Error restoring project:", err);
      res.status(500).json({ error: "Failed to restore project from history" });
    }
  }
);

export default router;
