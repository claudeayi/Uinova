// src/controllers/assistantController.ts
import { Request, Response } from "express";
import { z } from "zod";
import * as assistantService from "../services/assistantService";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  Validation
 * ========================================================================== */
const ChatSchema = z.object({
  message: z.string().min(1, "Message requis"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      })
    )
    .optional(),
  stream: z.boolean().optional().default(false),
});

/* ============================================================================
 *  POST /api/assistant/chat
 * ========================================================================== */
export async function chatWithAssistant(req: Request, res: Response) {
  try {
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const { message, history = [], stream } = parsed.data;

    const user = (req as any).user;
    const userId = user?.id || "anonymous";

    // ⏺️ Sauvegarde entrée utilisateur (audit log IA)
    await prisma.auditLog.create({
      data: {
        userId,
        action: "AI_CHAT_INPUT",
        details: message,
        metadata: { historyLength: history.length, stream },
      },
    });

    // ⚡ Cas streaming → SSE (Server-Sent Events)
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      await assistantService.streamAIResponse(
        message,
        history,
        (chunk: string) => res.write(`data: ${chunk}\n\n`),
        (err?: Error) => {
          if (err) {
            console.error("❌ streamAIResponse error:", err);
            res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
          }
          res.end();
        }
      );
      return;
    }

    // ⚡ Cas normal → réponse complète
    const reply = await assistantService.getAIResponse(message, history);

    // ⏺️ Sauvegarde réponse IA
    await prisma.auditLog.create({
      data: {
        userId,
        action: "AI_CHAT_OUTPUT",
        details: reply,
        metadata: { input: message },
      },
    });

    return res.json({ success: true, reply });
  } catch (err: any) {
    console.error("❌ chatWithAssistant error:", err);
    return res.status(500).json({
      success: false,
      error: "Erreur assistant IA",
      details: err.message || "unknown_error",
    });
  }
}
