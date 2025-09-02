import { prisma } from "../utils/prisma";
import { emitEvent } from "./eventBus";
import zlib from "zlib";

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
  meta: {
    totalSteps: number;
    users: string[];
    startedAt: Date | null;
    endedAt: Date | null;
    durationMs: number | null;
  };
}

/* ============================================================================
 *  Service de replay collaboratif
 * ========================================================================== */

/**
 * Rejoue tout l’historique collaboratif d’un projet.
 * @param projectId string | number
 * @returns ReplayResult (steps + finalState + meta)
 */
export async function replayProjectHistory(
  projectId: string
): Promise<ReplayResult> {
  const history = await prisma.collabHistory.findMany({
    where: { projectId: String(projectId) },
    orderBy: { createdAt: "asc" },
  });

  let finalState: any = {};
  const steps: ReplayStep[] = [];

  for (const entry of history) {
    // Merge naïf (V3) → TODO: remplacer par CRDT/JSONPatch pour V4
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

  const meta = {
    totalSteps: steps.length,
    users: Array.from(new Set(steps.map((s) => s.userId))),
    startedAt: steps.length > 0 ? steps[0].at : null,
    endedAt: steps.length > 0 ? steps[steps.length - 1].at : null,
    durationMs:
      steps.length > 1
        ? steps[steps.length - 1].at.getTime() - steps[0].at.getTime()
        : null,
  };

  return { projectId: String(projectId), steps, finalState, meta };
}

/**
 * Liste les sessions de replay stockées (Admin/analytics)
 */
export async function listReplaySessions(limit = 50) {
  return prisma.replaySession.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Sauvegarde une session de replay compressée en DB
 */
export async function saveReplaySession(projectId: string, userId: string) {
  const result = await replayProjectHistory(projectId);

  // Compression steps
  const compressedSteps = zlib.gzipSync(JSON.stringify(result.steps));

  const session = await prisma.replaySession.create({
    data: {
      projectId: String(projectId),
      userId,
      snapshot: result.finalState,
      stepsCompressed: compressedSteps, // ⚡ nouveau champ dans ReplaySession
      startedAt: result.meta.startedAt,
      endedAt: result.meta.endedAt,
    },
  });

  emitEvent("replay.session.saved", {
    sessionId: session.id,
    projectId,
    userId,
    meta: result.meta,
  });

  return session;
}

/**
 * Récupère et décompresse une session persistée
 */
export async function getReplaySession(sessionId: string): Promise<ReplayResult | null> {
  const session = await prisma.replaySession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return null;

  const steps: ReplayStep[] = session.stepsCompressed
    ? JSON.parse(zlib.gunzipSync(session.stepsCompressed).toString("utf-8"))
    : [];

  return {
    projectId: session.projectId,
    steps,
    finalState: session.snapshot,
    meta: {
      totalSteps: steps.length,
      users: Array.from(new Set(steps.map((s) => s.userId))),
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMs:
        session.startedAt && session.endedAt
          ? session.endedAt.getTime() - session.startedAt.getTime()
          : null,
    },
  };
}
