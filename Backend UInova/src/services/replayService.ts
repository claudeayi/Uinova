// src/services/replayService.ts
import { prisma } from "../utils/prisma";

export interface ReplayStep {
  userId: string;
  at: Date;
  changes: any;
  snapshot: any;
}

export interface ReplayResult {
  projectId: string;
  steps: ReplayStep[];
  finalState: any;
}

/* ============================================================================
 *  Service de replay collaboratif
 * ========================================================================== */

/**
 * Rejoue tout l’historique collaboratif d’un projet.
 * @param projectId string | number
 * @returns ReplayResult (steps + finalState)
 */
export async function replayProjectHistory(projectId: string): Promise<ReplayResult> {
  const history = await prisma.collabHistory.findMany({
    where: { projectId: String(projectId) },
    orderBy: { createdAt: "asc" },
  });

  let finalState: any = {};
  const steps: ReplayStep[] = [];

  for (const entry of history) {
    // Merge naïf (à remplacer par CRDT/JSONPatch si besoin V4)
    finalState = {
      ...finalState,
      ...entry.changes,
    };

    steps.push({
      userId: entry.userId,
      at: entry.createdAt,
      changes: entry.changes,
      snapshot: { ...finalState },
    });
  }

  return { projectId: String(projectId), steps, finalState };
}

/**
 * Liste les sessions de replay stockées (ex: pour Admin/analytics)
 */
export async function listReplaySessions(limit = 50) {
  return prisma.replaySession.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Crée une session de replay persistée (optionnel)
 */
export async function saveReplaySession(projectId: string, userId: string) {
  const result = await replayProjectHistory(projectId);

  return prisma.replaySession.create({
    data: {
      projectId: String(projectId),
      userId,
      snapshot: result.finalState,
      steps: result.steps,
    },
  });
}
