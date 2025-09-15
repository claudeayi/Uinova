// src/services/aiOrchestratorService.ts
import OpenAI from "openai";
import { logger } from "../utils/logger";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "test-key",
  timeout: 30000,
});

export class AIOrchestrator {
  private defaultModel =
    process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";

  /* ============================================================================
   * Génération d’UI (JSON Schema basé sur React/Flutter)
   * ========================================================================== */
  async generateUI(prompt: string, options?: { model?: string }) {
    const model = options?.model || this.defaultModel;
    const start = Date.now();

    try {
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

      const content = res.choices[0]?.message?.content || "";
      logger.info(`[AIOrchestrator] generateUI done in ${Date.now() - start}ms`);

      try {
        return JSON.parse(content);
      } catch {
        logger.warn("⚠️ generateUI returned invalid JSON, attempting fallback");
        return this.validateSchema(content).fixed;
      }
    } catch (err: any) {
      logger.error("❌ generateUI error", err?.message);
      return { type: "page", elements: [] };
    }
  }

  /* ============================================================================
   * Validation / Correction JSON
   * ========================================================================== */
  async validateSchema(schema: any) {
    try {
      if (typeof schema === "string") schema = JSON.parse(schema);
      JSON.parse(JSON.stringify(schema));
      return { valid: true, schema };
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
      return {
        suggestions: [
          "📱 Augmenter la taille des boutons pour une meilleure ergonomie mobile.",
          "🎨 Améliorer le contraste texte/fond pour l’accessibilité.",
          "⚡ Charger les images en lazy-loading pour optimiser les performances.",
          "♿ Ajouter des labels ARIA pour les formulaires.",
          "✨ Intégrer de petites animations (Framer Motion) pour améliorer l’UX.",
        ],
        schema,
      };
    } catch (err) {
      logger.error("❌ optimizeUX error", err?.message);
      return { suggestions: [], schema };
    }
  }

  /* ============================================================================
   * Suggestions de raffinement IA (expérimental)
   * ========================================================================== */
  async suggestRefinements(schema: any, prompt: string) {
    const model = this.defaultModel;
    try {
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

      return JSON.parse(res.choices[0]?.message?.content || "{}");
    } catch (err: any) {
      logger.error("❌ suggestRefinements error", err?.message);
      return { suggestions: [] };
    }
  }
}
