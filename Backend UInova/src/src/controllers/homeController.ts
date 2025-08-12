// src/controllers/homeController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { toProjectCardDTO } from "../utils/dto";

/**
 * GET /api/home/summary
 * Query (facultatif):
 *  - limit: nombre max de projets (par défaut 12)
 *  - withInsights: "1" pour inclure recentExports/unread/lastActivity
 *
 * Réponse:
 *  {
 *    cards: ProjectCardDTO[],
 *    totals: { enCours:number, termines:number, planifies:number, total:number },
 *    insights?: {
 *      unread: { notifications:number },
 *      recentExports: { id:any; type:string; status:string; projectId:any; pageId:any|null; createdAt:Date }[],
 *      lastActivity: Date | null
 *    }
 *  }
 */
export async function homeSummary(req: any, res: Response) {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Utilisateur non authentifié" });
    }

    const limit = clampInt(req.query.limit as string, 1, 100, 12);
    const wantInsights = (req.query.withInsights as string) === "1";

    // Récupération des projets de l'utilisateur
    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true, name: true, tagline: true, icon: true,
        status: true, updatedAt: true,
      },
    });

    const cards = projects.map(toProjectCardDTO);

    // Totaux par statut (sur l'ensemble des projets de l'utilisateur)
    const [countAll, countInProgress, countDone, countPlanned] = await Promise.all([
      prisma.project.count({ where: { ownerId: userId } }),
      prisma.project.count({ where: { ownerId: userId, status: "IN_PROGRESS" } }),
      prisma.project.count({ where: { ownerId: userId, status: "DONE" } }),
      prisma.project.count({ where: { ownerId: userId, status: "PLANNED" } }),
    ]);

    const totals = {
      enCours: countInProgress,
      termines: countDone,
      planifies: countPlanned,
      total: countAll,
    };

    // Insights (facultatif, coût modéré)
    let insights: any | undefined;
    if (wantInsights) {
      const [unreadCount, recentExports, lastProjectActivity] = await Promise.all([
        prisma.notification.count({ where: { userId, read: false } }).catch(() => 0),
        prisma.export.findMany({
          where: { project: { ownerId: userId } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, type: true, status: true, projectId: true, pageId: true, createdAt: true },
        }).catch(() => [] as any[]),
        prisma.project.findFirst({
          where: { ownerId: userId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }).then(p => p?.updatedAt ?? null).catch(() => null),
      ]);

      insights = {
        unread: { notifications: unreadCount },
        recentExports,
        lastActivity: lastProjectActivity ?? null,
      };
    }

    res.json({ cards, totals, ...(insights ? { insights } : {}) });
  } catch (err: any) {
    // Log éventuellement avec ton logger util
    // logger.error("homeSummary failed", { err });
    res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Erreur interne du serveur" });
  }
}

/* ======================
 * Helpers
 * ====================== */
function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
