import { createWorker } from "../utils/redis";
import { AIOrchestrator } from "../services/aiOrchestratorService";
import { prisma } from "../utils/prisma";

const ai = new AIOrchestrator();

/* ============================================================================
 * AI WORKER – Orchestrateur des tâches IA (UI, validation, UX, etc.)
 * ========================================================================== */
export const aiWorker = createWorker("ai", async (job) => {
  const start = Date.now();
  console.log("🤖 [AI Worker] Job reçu:", job.id, job.data);

  const { prompt, schema, type } = job.data;
  const result: Record<string, any> = {};
  let status: "SUCCESS" | "FAILED" = "SUCCESS";
  let error: string | null = null;

  try {
    switch (type) {
      case "generateUI":
        if (!prompt) throw new Error("❌ Missing prompt for generateUI");
        result.generated = await ai.generateUI(prompt);
        break;

      case "validateSchema":
        if (!schema) throw new Error("❌ Missing schema for validateSchema");
        result.validation = await ai.validateSchema(schema);
        break;

      case "optimizeUX":
        if (!schema) throw new Error("❌ Missing schema for optimizeUX");
        result.optimization = await ai.optimizeUX(schema);
        break;

      case "fullPipeline":
        if (!prompt && !schema) throw new Error("❌ Missing prompt or schema for fullPipeline");
        if (prompt) result.generated = await ai.generateUI(prompt);
        if (schema) {
          result.validation = await ai.validateSchema(schema);
          result.optimization = await ai.optimizeUX(schema);
        }
        break;

      case "summarize":
        if (!prompt) throw new Error("❌ Missing prompt for summarize");
        result.summary = await ai.summarize(prompt);
        break;

      default:
        throw new Error(`❌ Unknown AI job type: ${type}`);
    }
  } catch (err: any) {
    status = "FAILED";
    error = err.message;
    console.error("❌ [AI Worker] Job error:", job.id, error);
    throw err; // Permet à BullMQ/Redis de gérer le retry
  } finally {
    const latency = Date.now() - start;

    // 📊 Sauvegarde du log en DB
    await prisma.aiJobLog.create({
      data: {
        jobId: job.id.toString(),
        queue: "ai",
        type: type || "unknown",
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
});
