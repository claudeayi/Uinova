// src/controllers/replayController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { getReplaySession, saveReplaySession } from "../services/replayService";
import { v4 as uuidv4, validate as isUuid } from "uuid";
import zlib from "zlib";

/* ============================================================================
 *  REPLAY CONTROLLER – gestion des replays collaboratifs
 * ========================================================================== */

// ✅ POST /replay/:projectId/start → commencer un enregistrement
export async function startReplay(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });
    if (!isUuid(projectId)) return res.status(400).json({ success: false, message: "projectId invalide" });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès interdit à ce projet" });
    }

    const replay = await prisma.replaySession.create({
      data: {
        projectId,
        userId: user.id,
        dataUrl: "",
        startedAt: new Date(),
        status: "ACTIVE",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_START",
        metadata: { projectId, replayId: replay.id, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });

    res.status(201).json({ success: true, message: "Replay démarré", data: replay });
  } catch (err: any) {
    console.error("❌ startReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ POST /replay/:projectId/stop → arrêter l'enregistrement
export async function stopReplay(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { replayId, dataUrl } = req.body;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });
    if (!replayId || !isUuid(replayId)) {
      return res.status(400).json({ success: false, message: "replayId invalide" });
    }

    const replay = await prisma.replaySession.findUnique({ where: { id: replayId } });
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });
    if (replay.projectId !== projectId) {
      return res.status(400).json({ success: false, message: "Replay invalide pour ce projet" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    const savedSession = await saveReplaySession(projectId, user.id);

    const updated = await prisma.replaySession.update({
      where: { id: replayId },
      data: {
        dataUrl: dataUrl || `/replays/${projectId}-${Date.now()}.json`,
        endedAt: new Date(),
        stepsCompressed: savedSession.stepsCompressed,
        snapshot: savedSession.snapshot,
        status: "COMPLETED",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_STOP",
        metadata: { projectId, replayId, dataUrl: updated.dataUrl, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });

    res.json({ success: true, message: "Replay enregistré", data: updated });
  } catch (err: any) {
    console.error("❌ stopReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId → liste des replays du projet
export async function listReplays(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { userId, from, to } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { projectId };
    if (userId) where.userId = String(userId);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const [replays, total] = await Promise.all([
      prisma.replaySession.findMany({
        where,
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.replaySession.count({ where }),
    ]);

    res.json({
      success: true,
      data: replays,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("❌ listReplays error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId/:replayId → détail d’un replay
export async function getReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    if (!replayId || !isUuid(replayId)) {
      return res.status(400).json({ success: false, message: "replayId invalide" });
    }

    const replay = await getReplaySession(replayId);
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    res.json({ success: true, data: replay });
  } catch (err: any) {
    console.error("❌ getReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ DELETE /replay/:projectId/:replayId → suppression
export async function deleteReplay(req: Request, res: Response) {
  try {
    const { projectId, replayId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });

    const replay = await prisma.replaySession.findUnique({ where: { id: replayId } });
    if (!replay || replay.projectId !== projectId) {
      return res.status(404).json({ success: false, message: "Replay introuvable" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    await prisma.replaySession.update({
      where: { id: replayId },
      data: { status: "DELETED", deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_DELETE",
        metadata: { projectId, replayId, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });

    res.json({ success: true, message: "Replay supprimé (soft delete)" });
  } catch (err: any) {
    console.error("❌ deleteReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

/* ============================================================================
 *  ENDPOINTS SUPPLÉMENTAIRES
 * ========================================================================== */

// ✅ Restaurer un replay supprimé
export async function restoreReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    const user = (req as any).user;
    if (!user?.id || user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès admin requis" });
    }

    const replay = await prisma.replaySession.update({
      where: { id: replayId },
      data: { status: "COMPLETED", deletedAt: null },
    });

    res.json({ success: true, message: "Replay restauré", data: replay });
  } catch (err: any) {
    console.error("❌ restoreReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ Exporter un replay (JSON ou ZIP compressé)
export async function exportReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    const replay = await getReplaySession(replayId);
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    const accept = req.query.format || "json";
    if (accept === "zip") {
      const compressed = zlib.gzipSync(JSON.stringify(replay, null, 2));
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=replay-${replayId}.zip`);
      res.send(compressed);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=replay-${replayId}.json`);
      res.send(JSON.stringify(replay, null, 2));
    }
  } catch (err: any) {
    console.error("❌ exportReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ SSE → rejouer un replay en streaming
export async function streamReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    const replay = await getReplaySession(replayId);
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    replay.steps.forEach((s, i) => {
      setTimeout(() => {
        res.write(`data: ${JSON.stringify(s)}\n\n`);
        if (i === replay.steps.length - 1) res.end();
      }, i * 500);
    });
  } catch (err: any) {
    console.error("❌ streamReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ Analyse d’un replay
export async function analyzeReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    const replay = await getReplaySession(replayId);
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    const stats = {
      steps: replay.steps.length,
      users: replay.meta.users.length,
      durationMs: replay.meta.durationMs,
      avgStepTime: replay.meta.durationMs && replay.steps.length > 1
        ? replay.meta.durationMs / replay.steps.length
        : null,
    };

    res.json({ success: true, data: stats });
  } catch (err: any) {
    console.error("❌ analyzeReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ Comparer deux replays
export async function compareReplays(req: Request, res: Response) {
  try {
    const { replayA, replayB } = req.query;
    if (!replayA || !replayB) return res.status(400).json({ success: false, message: "Deux replays requis" });

    const r1 = await getReplaySession(String(replayA));
    const r2 = await getReplaySession(String(replayB));
    if (!r1 || !r2) return res.status(404).json({ success: false, message: "Replay introuvable" });

    const diffSteps = Math.abs(r1.steps.length - r2.steps.length);
    const diffDuration = (r1.meta.durationMs || 0) - (r2.meta.durationMs || 0);

    res.json({
      success: true,
      data: {
        replayA: r1.meta,
        replayB: r2.meta,
        diffSteps,
        diffDuration,
      },
    });
  } catch (err: any) {
    console.error("❌ compareReplays error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

/* ============================================================================
 *  ADMIN ENDPOINTS
 * ========================================================================== */
export async function listAllReplays(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès admin requis" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
    const skip = (page - 1) * limit;

    const [replays, total] = await Promise.all([
      prisma.replaySession.findMany({
        include: {
          project: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.replaySession.count(),
    ]);

    res.json({
      success: true,
      data: replays,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("❌ listAllReplays error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}
