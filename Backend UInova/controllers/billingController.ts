import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  📊 Usage Controller – Rapports & Historique d’utilisation
 *  - Inclut API calls, stockage, projets
 *  - Gestion d’erreurs robuste
 *  - Filtrage temporel (daily, monthly, yearly)
 *  - Résultats structurés pour dashboard
 * ========================================================================== */

/**
 * GET /api/usage/report
 * Rapport global d’utilisation (API, stockage, projets)
 */
export async function getUsageReport(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [api, storage, projects] = await Promise.all([
      prisma.usageRecord.count({ where: { userId, type: "api_call" } }),
      prisma.usageRecord.aggregate({
        _sum: { amount: true },
        where: { userId, type: "storage" },
      }),
      prisma.project.count({ where: { ownerId: userId } }),
    ]);

    res.json({
      success: true,
      data: {
        apiCalls: api,
        storageMB: storage._sum.amount || 0,
        projects,
      },
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("❌ getUsageReport:", error);
    res.status(500).json({ error: "Failed to generate usage report" });
  }
}

/**
 * GET /api/usage/history
 * Historique détaillé avec pagination et filtres
 * Query params: ?period=month&limit=50
 */
export async function getUsageHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { period = "month", limit = 100 } = req.query;

    // Définition de la période de filtrage
    let dateFilter: Date | undefined;
    const now = new Date();
    if (period === "day") dateFilter = new Date(now.setDate(now.getDate() - 1));
    else if (period === "week") dateFilter = new Date(now.setDate(now.getDate() - 7));
    else if (period === "month") dateFilter = new Date(now.setMonth(now.getMonth() - 1));
    else if (period === "year") dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));

    const history = await prisma.usageHistory.findMany({
      where: {
        userId,
        ...(dateFilter && { date: { gte: dateFilter } }),
      },
      orderBy: { date: "asc" },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: history,
      pagination: { limit: Number(limit) },
    });
  } catch (error) {
    console.error("❌ getUsageHistory:", error);
    res.status(500).json({ error: "Failed to fetch usage history" });
  }
}

/**
 * GET /api/usage/stats
 * Statistiques avancées d’utilisation (par jour/semaine/mois)
 */
export async function getUsageStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const dailyStats = await prisma.$queryRaw<
      { date: string; apiCalls: number; storageMB: number }[]
    >`
      SELECT 
        DATE(date) as date,
        SUM(CASE WHEN type = 'api_call' THEN 1 ELSE 0 END) as "apiCalls",
        SUM(CASE WHEN type = 'storage' THEN amount ELSE 0 END) as "storageMB"
      FROM "UsageHistory"
      WHERE "userId" = ${userId}
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `;

    res.json({
      success: true,
      data: dailyStats,
    });
  } catch (error) {
    console.error("❌ getUsageStats:", error);
    res.status(500).json({ error: "Failed to fetch usage stats" });
  }
}
