// src/services/replayService.ts
import { prisma } from "../utils/prisma";
import { emitEvent } from "./eventBus";
import { logger } from "../utils/logger";
import zlib from "zlib";

/* ============================================================================
 * Types
 * ========================================================================== */
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
 * Rejoue l’historique d’un projet (collabHistory)
 * ========================================================================== */
export async function replayProjectHistory(
  projectId: string
): Promise<ReplayResult> {
  try {
    const history = await prisma.collabHistory.findMany({
      where: { projectId: String(projectId) },
      orderBy: { createdAt: "asc" },
    });

    let finalState: any = {};
    const steps: ReplayStep[] = [];

    for (const entry of history) {
      // ⚡ Merge naïf (V3) – remplaçable par CRDT ou JSONPatch (future V4)
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
      startedAt: steps[0]?.at || null,
      endedAt: steps.length > 0 ? steps[steps.length - 1].at : null,
      durationMs:
        steps.length > 1
          ? steps[steps.length - 1].at.getTime() - steps[0].at.getTime()
          : null,
    };

    logger.info("🔁 Replay history generated", { projectId, totalSteps: steps.length });

    return { projectId: String(projectId), steps, finalState, meta };
  } catch (err: any) {
    logger.error("❌ replayProjectHistory error", { projectId, error: err.message });
    throw new Error("Impossible de rejouer l’historique du projet");
  }
}

/* ============================================================================
 * Liste sessions de replay (Admin / analytics)
 * ========================================================================== */
export async function listReplaySessions(limit = 50) {
  try {
    return prisma.replaySession.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  } catch (err: any) {
    logger.error("❌ listReplaySessions error", { error: err.message });
    throw new Error("Impossible de lister les sessions de replay");
  }
}

/* ============================================================================
 * Sauvegarde session compressée
 * ========================================================================== */
export async function saveReplaySession(projectId: string, userId: string) {
  try {
    const result = await replayProjectHistory(projectId);

    // ⚡ Compression steps
    const compressedSteps = zlib.gzipSync(JSON.stringify(result.steps));

    const session = await prisma.replaySession.create({
      data: {
        projectId: String(projectId),
        userId,
        snapshot: result.finalState,
        stepsCompressed: compressedSteps, // champ binaire (Buffer)
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

    logger.info("💾 Replay session saved", {
      projectId,
      userId,
      sessionId: session.id,
      totalSteps: result.meta.totalSteps,
    });

    return session;
  } catch (err: any) {
    logger.error("❌ saveReplaySession error", { projectId, userId, error: err.message });
    throw new Error("Impossible de sauvegarder la session de replay");
  }
}

/* ============================================================================
 * Lecture + décompression session
 * ========================================================================== */
export async function getReplaySession(
  sessionId: string
): Promise<ReplayResult | null> {
  try {
    const session = await prisma.replaySession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return null;

    let steps: ReplayStep[] = [];
    try {
      steps = session.stepsCompressed
        ? JSON.parse(zlib.gunzipSync(session.stepsCompressed).toString("utf-8"))
        : [];
    } catch (err: any) {
      logger.error("❌ Replay decompression failed", {
        sessionId,
        error: err.message,
      });
    }

    const meta = {
      totalSteps: steps.length,
      users: Array.from(new Set(steps.map((s) => s.userId))),
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMs:
        session.startedAt && session.endedAt
          ? session.endedAt.getTime() - session.startedAt.getTime()
          : null,
    };

    logger.info("📂 Replay session loaded", { sessionId, totalSteps: steps.length });

    return {
      projectId: session.projectId,
      steps,
      finalState: session.snapshot,
      meta,
    };
  } catch (err: any) {
    logger.error("❌ getReplaySession error", { sessionId, error: err.message });
    throw new Error("Impossible de charger la session de replay");
  }
}
