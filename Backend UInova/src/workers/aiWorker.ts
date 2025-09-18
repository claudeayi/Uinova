// src/workers/aiWorker.ts
import { createWorker } from "../utils/redis";
import { AIOrchestrator } from "../services/aiOrchestratorService";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { aiQueue, pauseAllQueues } from "../jobs/queues";

const ai = new AIOrchestrator();

/* ============================================================================
 *  VALIDATION SCHEMA (sécurise le type de job et payload)
 * ========================================================================== */
const AIJobSchema = z.object({
  type: z.enum([
    "generateUI",
    "validateSchema",
    "optimizeUX",
    "fullPipeline",
    "summarize",
  ]),
  prompt: z.string().max(5000).optional(),
  schema: z.any().optional(),
});

/* ============================================================================
 *  AI WORKER – Orchestrateur des tâches IA (UI, validation, UX, etc.)
 * ========================================================================== */
export const aiWorker = createWorker(
  "ai",
  async (job) => {
    const start = Date.now();
    console.log("🤖 [AI Worker] Job reçu:", job.id, job.data);

    const parsed = AIJobSchema.safeParse(job.data);
    if (!parsed.success) {
      throw new Error("❌ Invalid AI job payload: " + JSON.stringify(parsed.error.format()));
    }

    const { prompt, schema, type } = parsed.data;
    const result: Record<string, any> = {};
    let status: "SUCCESS" | "FAILED" = "SUCCESS";
    let error: string | null = null;

    try {
      switch (type) {
        case "generateUI":
          result.generated = await ai.generateUI(prompt!);
          break;

        case "validateSchema":
          result.validation = await ai.validateSchema(schema);
          break;

        case "optimizeUX":
          result.optimization = await ai.optimizeUX(schema);
          break;

        case "fullPipeline":
          if (prompt) result.generated = await ai.generateUI(prompt);
          if (schema) {
            result.validation = await ai.validateSchema(schema);
            result.optimization = await ai.optimizeUX(schema);
          }
          break;

        case "summarize":
          result.summary = await ai.summarize(prompt!);
          break;

        default:
          throw new Error(`❌ Unknown AI job type: ${type}`);
      }
    } catch (err: any) {
      status = "FAILED";
      error = err.message;
      console.error("❌ [AI Worker] Job error:", job.id, error);

      // 🔔 Alerte si trop d’échecs récents
      const failedCount = await aiQueue.getFailedCount();
      if (failedCount > 5) {
        console.warn("🚨 Trop d’échecs, mise en pause automatique de la queue AI");
        await pauseAllQueues();
        // TODO: envoyer une notif Slack/Email aux admins
      }

      throw err; // Laisse BullMQ gérer le retry
    } finally {
      const latency = Date.now() - start;

      // 📊 Sauvegarde du log en DB
      await prisma.aiJobLog.create({
        data: {
          jobId: job.id.toString(),
          queue: "ai",
          type,
          status,
          latencyMs: latency,
          input: job.data,
          output: result,
          error,
        },
      });

      console.log(
        `📊 [AI Worker] Job ${job.id} terminé (${status}) en ${latency}ms`
      );
    }

    return result;
  },
  {
    concurrency: Number(process.env.AI_WORKER_CONCURRENCY || 5),
  }
);

/* ============================================================================
 *  HOOKS (monitoring avancé)
 * ========================================================================== */
aiWorker.on("completed", (job, result) => {
  console.log(`✅ [AI Worker] Job ${job.id} complété:`, result);
});

aiWorker.on("failed", (job, err) => {
  console.error(`❌ [AI Worker] Job ${job.id} échoué:`, err?.message);
});

aiWorker.on("stalled", (jobId) => {
  console.warn(`⚠️ [AI Worker] Job ${jobId} stalled (bloqué)`);
});
