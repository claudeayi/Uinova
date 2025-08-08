// src/controllers/aiController.ts

import { Request, Response } from "express";
import { generateAssistantResponse } from "../services/aiService";
import { moderatePrompt } from "../utils/aiModeration";

/**
 * POST /api/ai/chat
 * Corps attendu : { prompt: string, history?: [{role: string, content: string}] }
 * Réponse : { answer: string }
 */
export const chat = async (req: Request, res: Response) => {
  const { prompt, history } = req.body;

  // Vérifie présence du prompt
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ message: "Prompt manquant ou invalide." });
  }

  // (Optionnel) Limite la longueur du prompt ou du contexte
  if (prompt.length > 1000) {
    return res.status(413).json({ message: "Prompt trop long." });
  }

  // Modération (anti-spam, anti-toxicité)
  if (!moderatePrompt(prompt)) {
    return res.status(403).json({ message: "Prompt non autorisé par la politique UInova." });
  }

  try {
    // Appelle OpenAI via le service
    const answer = await generateAssistantResponse(prompt, Array.isArray(history) ? history : []);
    res.json({ answer });
  } catch (e: any) {
    console.error("[AI] Erreur OpenAI:", e);
    res.status(500).json({ error: "Erreur lors de la génération AI.", details: e?.message });
  }
};
