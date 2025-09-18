// src/services/aiOrchestratorService.ts
import OpenAI from "openai";
import { logger } from "../utils/logger";
import { metrics } from "../utils/metrics";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";
import { z } from "zod";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "test-key",
  timeout: 30000,
});

/* ============================================================================
 * ZOD SCHEMAS
 * ========================================================================== */
const uiSchema = z.object({
  type: z.string(),
  elements: z.array(z.any()),
});

const refinementSchema = z.object({
  suggestions: z.array(z.string()).default([]),
});

/* ============================================================================
 * AI Orchestrator Service
 * ========================================================================== */
export class AIOrchestrator {
  private defaultModel = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";

  private async safeCall<T>(fn: () => Promise<T>, action: string, userId?: string): Promise<T | null> {
    const start = Date.now();
    try {
      const res = await fn();
      metrics.aiCalls.inc({ action, status: "success" });
      metrics.aiLatency.observe({ action }, Date.now() - start);
      return res;
    } catch (err: any) {
      logger.error(`❌ AIOrchestrator ${action} error`, err?.message);
      metrics.aiCalls.inc({ action, status: "error" });
      metrics.aiLatency.observe({ action }, Date.now() - start);
      await auditLog.log(userId || "system", "AI_ERROR", { action, error: err?.message });
      return null;
    }
  }

  /* ============================================================================
   * Génération d’UI (JSON Schema basé sur React/Flutter)
   * ========================================================================== */
  async generateUI(prompt: string, options?: { model?: string; userId?: string }) {
    const model = options?.model || this.defaultModel;
    const userId = options?.userId;

    const result = await this.safeCall(
      async () => {
        const res = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "Tu es un assistant expert en UI no-code. Génère un schéma JSON décrivant une interface en React + Flutter. Sois strictement JSON valide.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        });

        const content = res.choices[0]?.message?.content || "{}";
        const parsed = uiSchema.safeParse(JSON.parse(content));
        if (!parsed.success) {
          logger.warn("⚠️ generateUI returned invalid JSON, applying fallback");
          return { type: "page", elements: [] };
        }

        await auditLog.log(userId || "system", "AI_UI_GENERATED", { model, prompt });
        emitEvent("ai.ui.generated", { userId, model });
        return parsed.data;
      },
      "generateUI",
      userId
    );

    return result || { type: "page", elements: [] };
  }

  /* ============================================================================
   * Validation / Correction JSON
   * ========================================================================== */
  async validateSchema(schema: any) {
    try {
      if (typeof schema === "string") schema = JSON.parse(schema);
      const parsed = uiSchema.safeParse(schema);
      return parsed.success
        ? { valid: true, schema: parsed.data }
        : { valid: false, fixed: { type: "page", elements: [] } };
    } catch {
      logger.warn("⚠️ validateSchema failed, applying fallback schema");
      return { valid: false, fixed: { type: "page", elements: [] } };
    }
  }

  /* ============================================================================
   * Optimisation UX (accessibilité, responsive…)
   * ========================================================================== */
  async optimizeUX(schema: any) {
    try {
      const parsed = await this.validateSchema(schema);
      return {
        suggestions: [
          "📱 Augmenter la taille des boutons pour une meilleure ergonomie mobile.",
          "🎨 Améliorer le contraste texte/fond pour l’accessibilité.",
          "⚡ Charger les images en lazy-loading pour optimiser les performances.",
          "♿ Ajouter des labels ARIA pour les formulaires.",
          "✨ Intégrer de petites animations (Framer Motion) pour améliorer l’UX.",
        ],
        schema: parsed.valid ? parsed.schema : parsed.fixed,
      };
    } catch (err: any) {
      logger.error("❌ optimizeUX error", err?.message);
      return { suggestions: [], schema };
    }
  }

  /* ============================================================================
   * Suggestions de raffinement IA (expérimental)
   * ========================================================================== */
  async suggestRefinements(schema: any, prompt: string, options?: { userId?: string }) {
    const userId = options?.userId;
    const model = this.defaultModel;

    const result = await this.safeCall(
      async () => {
        const res = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "Analyse ce schéma JSON d’UI et propose des améliorations concrètes (ergonomie, design, structure). Réponds en JSON valide avec un champ 'suggestions'.",
            },
            { role: "user", content: JSON.stringify(schema) },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
          response_format: { type: "json_object" },
        });

        const content = res.choices[0]?.message?.content || "{}";
        const parsed = refinementSchema.safeParse(JSON.parse(content));
        if (!parsed.success) return { suggestions: [] };

        await auditLog.log(userId || "system", "AI_REFINEMENTS_SUGGESTED", { prompt });
        emitEvent("ai.ui.refinement", { userId, prompt });
        return parsed.data;
      },
      "suggestRefinements",
      userId
    );

    return result || { suggestions: [] };
  }
}

export const aiOrchestrator = new AIOrchestrator();
