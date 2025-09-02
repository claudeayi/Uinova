// src/services/aiOrchestratorService.ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

export class AIOrchestrator {
  async generateUI(prompt: string) {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un assistant expert en UI no-code (React + Flutter)." },
        { role: "user", content: prompt }
      ],
    });
    return res.choices[0].message?.content ?? "";
  }

  async validateSchema(schema: any) {
    // ⚡ Corriger un JSON cassé
    try {
      JSON.parse(JSON.stringify(schema));
      return { valid: true, schema };
    } catch {
      return { valid: false, fixed: { type: "page", elements: [] } };
    }
  }

  async optimizeUX(schema: any) {
    // ⚡ Placeholder pour suggestions IA (future intégration)
    return {
      suggestions: [
        "Augmenter la taille des boutons pour mobile",
        "Améliorer le contraste pour l’accessibilité",
      ],
    };
  }
}
