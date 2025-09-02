import { createWorker } from "../utils/redis";
import { AIOrchestrator } from "../services/aiOrchestratorService";

const ai = new AIOrchestrator();

export const aiWorker = createWorker("ai", async (job) => {
  console.log("🤖 AI job:", job.id, job.data);

  const { prompt, schema } = job.data;
  const result: any = {};

  if (prompt) result.generated = await ai.generateUI(prompt);
  if (schema) {
    result.validation = await ai.validateSchema(schema);
    result.optimization = await ai.optimizeUX(schema);
  }

  return result;
});
