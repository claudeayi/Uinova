import { Request, Response } from "express";
import { z } from "zod";
import * as assistantService from "../services/assistantService";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterRequests = new client.Counter({
  name: "uinova_assistant_requests_total",
  help: "Nombre total de requêtes à l’assistant",
});
const counterErrors = new client.Counter({
  name: "uinova_assistant_errors_total",
  help: "Nombre d’erreurs assistant IA",
});
const counterStream = new client.Counter({
  name: "uinova_assistant_stream_total",
  help: "Nombre de sessions streaming assistant IA",
});

/* ============================================================================
 * Validation
 * ========================================================================== */
const ChatSchema = z.object({
  message: z.string().min(1, "Message requis").max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(4000),
      })
    )
    .max(50)
    .optional(),
  stream: z.boolean().optional().default(false),
});

/* ============================================================================
 *  POST /api/assistant/chat
 * ========================================================================== */
export async function chatWithAssistant(req: Request, res: Response) {
  const start = Date.now();
  try {
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      counterErrors.inc();
      return res
        .status(400)
        .json({ success: false, error: parsed.error.flatten() });
    }
    const { message, history = [], stream } = parsed.data;

    const user = (req as any).user || { id: "anonymous", role: "GUEST" };
    const userId = user?.id || "anonymous";

    counterRequests.inc();

    // ⏺️ Audit input
    await prisma.auditLog.create({
      data: {
        userId,
        action: "AI_CHAT_INPUT",
        details: message,
        metadata: {
          historyLength: history.length,
          stream,
          ip: req.ip,
          ua: req.headers["user-agent"],
        },
      },
    });
    emitEvent("assistant.chat.input", { userId, message });

    // ⚡ Cas streaming → SSE
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      counterStream.inc();

      // Heartbeat SSE
      const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
      }, 15000);

      await assistantService.streamAIResponse(
        message,
        history,
        (chunk: string) => res.write(`data: ${chunk}\n\n`),
        async (err?: Error, finalReply?: string) => {
          clearInterval(heartbeat);
          if (err) {
            counterErrors.inc();
            logger.error("❌ streamAIResponse error", err);
            res.write(
              `event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`
            );
          } else if (finalReply) {
            // Sauvegarde sortie IA
            await prisma.auditLog.create({
              data: {
                userId,
                action: "AI_CHAT_OUTPUT",
                details: finalReply,
                metadata: { input: message, latency: Date.now() - start },
              },
            });
            emitEvent("assistant.chat.output", { userId, reply: finalReply });
          }
          res.end();
        }
      );
      return;
    }

    // ⚡ Cas normal → réponse complète
    const reply = await assistantService.getAIResponse(message, history);

    // ⏺️ Sauvegarde sortie IA
    await prisma.auditLog.create({
      data: {
        userId,
        action: "AI_CHAT_OUTPUT",
        details: reply,
        metadata: {
          input: message,
          latency: Date.now() - start,
          ip: req.ip,
        },
      },
    });
    emitEvent("assistant.chat.output", { userId, reply });

    return res.json({ success: true, reply });
  } catch (err: any) {
    counterErrors.inc();
    logger.error("❌ chatWithAssistant error", err);
    return res.status(500).json({
      success: false,
      error: "Erreur assistant IA",
      details: err.message || "unknown_error",
    });
  }
}
