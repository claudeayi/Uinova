import { Request, Response } from "express";
import * as assistantService from "../services/assistantService";

export async function chatWithAssistant(req: Request, res: Response) {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message requis" });

    const reply = await assistantService.getAIResponse(message, history || []);
    res.json({ success: true, reply });
  } catch (err) {
    console.error("❌ chatWithAssistant:", err);
    res.status(500).json({ success: false, error: "Erreur assistant IA" });
  }
}
