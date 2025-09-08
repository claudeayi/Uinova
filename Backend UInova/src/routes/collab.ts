// src/routes/collab.ts
import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { prisma } from "../utils/prisma";

const router = Router();

// ⚡ Ces routes REST sont complémentaires :
// La synchro temps réel principale se fait via Socket.io (collabService).
router.use(authenticate);

/* ============================================================================
 *  STATE MANAGEMENT (CRDT)
 * ========================================================================== */

/**
 * GET /api/collab/:projectId/state
 * Récupérer l’état CRDT actuel d’un projet
 * (utile pour bootstrap ou fallback offline)
 */
router.get("/:projectId/state", async (req, res) => {
  const { projectId } = req.params;
  try {
    const state = await prisma.collabState.findUnique({
      where: { projectId },
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "Aucun état CRDT trouvé pour ce projet",
      });
    }

    res.json({
      success: true,
      projectId,
      crdt: state.encoded, // CRDT encodé (base64/json)
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    console.error("❌ collab/state error:", err);
    res.status(500).json({ error: "Erreur récupération état CRDT" });
  }
});

/**
 * POST /api/collab/:projectId/state
 * Forcer la mise à jour CRDT (admin ou service interne)
 */
router.post("/:projectId/state", async (req, res) => {
  const { projectId } = req.params;
  const { encoded } = req.body;

  if (!encoded) {
    return res.status(400).json({ error: "CRDT encodé manquant" });
  }

  try {
    const state = await prisma.collabState.upsert({
      where: { projectId },
      update: { encoded, updatedAt: new Date() },
      create: { projectId, encoded },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "COLLAB_STATE_UPDATE",
        metadata: { projectId },
      },
    });

    res.json({ success: true, projectId, updatedAt: state.updatedAt });
  } catch (err) {
    console.error("❌ collab/state update error:", err);
    res.status(500).json({ error: "Erreur mise à jour état CRDT" });
  }
});

/* ============================================================================
 *  HISTORY MANAGEMENT
 * ========================================================================== */

/**
 * GET /api/collab/:projectId/history
 * Récupérer l’historique des changements CRDT (log compact)
 */
router.get("/:projectId/history", async (req, res) => {
  const { projectId } = req.params;
  try {
    const logs = await prisma.collabHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, projectId, logs });
  } catch (err) {
    console.error("❌ collab/history error:", err);
    res.status(500).json({ error: "Erreur récupération historique" });
  }
});

/**
 * DELETE /api/collab/:projectId/history
 * Purger l’historique (admin)
 */
router.delete("/:projectId/history", async (req, res) => {
  const { projectId } = req.params;
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  try {
    await prisma.collabHistory.deleteMany({ where: { projectId } });
    res.json({ success: true, message: `Historique du projet ${projectId} purgé` });
  } catch (err) {
    console.error("❌ collab/history purge error:", err);
    res.status(500).json({ error: "Erreur purge historique" });
  }
});

/* ============================================================================
 *  HEALTHCHECK
 * ========================================================================== */
router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "collab",
    mode: "REST + Socket.io",
    version: process.env.COLLAB_VERSION || "1.0.0",
    ts: Date.now(),
  });
});

export default router;
