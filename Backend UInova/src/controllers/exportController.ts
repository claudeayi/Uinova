// src/controllers/exportController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import * as policy from "../services/policy";
import * as cloud from "../services/cloud";
import { emitEvent } from "../services/eventBus";

let exportQueue: any = null;
try {
  exportQueue = require("../services/exportQueue").exportQueue;
} catch { /* ok si absent */ }

// ---- Config
const EXPORT_TYPES = ["react", "html", "flutter", "pwa"] as const;
const STATUS = ["pending", "ready", "failed"] as const;
const MAX_CONTENT_BYTES = 30 * 1024 * 1024;

// ---- Validation
const SaveExportSchema = z.object({
  type: z.enum(EXPORT_TYPES),
  content: z.string().optional(),
  strategy: z.enum(["direct", "enqueue"]).optional().default("direct"),
  meta: z.record(z.any()).optional(),
});

const ListQuerySchema = z.object({
  projectId: z.string().optional(),
  pageId: z.string().optional(),
  type: z.enum(EXPORT_TYPES).optional(),
  status: z.enum(STATUS as any).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt:desc", "createdAt:asc"]).default("createdAt:desc"),
});

// ---- Helpers
const toId = (v: any) => (v === undefined || v === null ? undefined : isNaN(Number(v)) ? String(v) : Number(v));

const exportSelect = {
  id: true,
  type: true,
  status: true,
  bundleUrl: true,
  createdAt: true,
  projectId: true,
  pageId: true,
  meta: true,
};

function dto(e: any) {
  return {
    id: e.id,
    type: e.type,
    status: e.status,
    bundleUrl: e.bundleUrl || null,
    createdAt: e.createdAt,
    projectId: e.projectId,
    pageId: e.pageId || null,
    meta: e.meta || null,
  };
}

async function ensureCanEditProject(req: Request, projectId: string | number) {
  const userId = (req as any)?.user?.sub || (req as any)?.user?.id;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { status: 401 });

  if (policy?.canAccessProject) {
    const ok = await policy.canAccessProject(userId, projectId, "EDIT");
    if (!ok) throw Object.assign(new Error("Forbidden"), { status: 403 });
  } else {
    const project = await prisma.project.findUnique({ where: { id: projectId as any }, select: { ownerId: true } });
    if (!project || project.ownerId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
}

/* ============================================================================
 *  CONTROLLERS
 * ========================================================================== */

// ✅ Sauvegarder un export
export const saveExport = async (req: Request, res: Response) => {
  try {
    const projectId = toId(req.params.projectId);
    const pageId = req.params.pageId ? toId(req.params.pageId) : undefined;
    if (!projectId) return res.status(400).json({ success: false, error: "projectId manquant" });

    await ensureCanEditProject(req, projectId);

    const parsed = SaveExportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid body", details: parsed.error.flatten() });
    }
    const { type, content, strategy, meta } = parsed.data;

    // 🔄 Mode enqueue
    if (strategy === "enqueue") {
      const rec = await prisma.export.create({
        data: { type, status: "pending", projectId: projectId as any, pageId: pageId as any, meta: meta ?? {} },
        select: exportSelect,
      });

      if (exportQueue?.add) {
        await exportQueue.add("export-project", {
          exportId: rec.id,
          projectId,
          pageId: pageId ?? null,
          type,
          userId: (req as any)?.user?.sub || null,
        });
      }

      emitEvent("export.enqueued", { exportId: rec.id, projectId, type });
      await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "EXPORT_ENQUEUED", details: rec } });

      return res.status(202).json({ success: true, data: dto(rec) });
    }

    // ⚡ Mode direct
    if (!content) return res.status(400).json({ success: false, error: "Content requis en mode direct" });

    const bytesApprox = Buffer.byteLength(content, "utf8");
    if (bytesApprox > MAX_CONTENT_BYTES) {
      return res.status(413).json({ success: false, error: "Contenu trop volumineux" });
    }

    let bundleUrl: string | null = null;
    const isDataUrl = /^data:.*;base64,/.test(content);

    if (isDataUrl && cloud?.putObjectFromBase64) {
      const base64 = content.split(",")[1] || "";
      bundleUrl = await cloud.putObjectFromBase64(`exports/${projectId}/${Date.now()}_${type}.zip`, base64);
    } else if (cloud?.putObjectFromBase64 && type !== "html") {
      const base64 = Buffer.from(content, "utf8").toString("base64");
      bundleUrl = await cloud.putObjectFromBase64(`exports/${projectId}/${Date.now()}_${type}.bin`, base64);
    }

    const rec = await prisma.export.create({
      data: {
        type,
        status: "ready",
        projectId: projectId as any,
        pageId: pageId as any,
        bundleUrl,
        meta: { ...(meta ?? {}), inline: bundleUrl ? false : true, content: bundleUrl ? undefined : content },
      },
      select: exportSelect,
    });

    emitEvent("export.saved", { exportId: rec.id, projectId, type });
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "EXPORT_SAVED", details: rec } });

    return res.status(201).json({ success: true, data: dto(rec) });
  } catch (e: any) {
    console.error("❌ saveExport error:", e);
    return res.status(e.status || 500).json({ success: false, error: e.message || "Internal server error" });
  }
};

// ✅ Lister les exports
export const list = async (req: Request, res: Response) => {
  try {
    const q = ListQuerySchema.safeParse(req.query);
    if (!q.success) {
      return res.status(400).json({ success: false, error: "Invalid query", details: q.error.flatten() });
    }
    const { projectId, pageId, type, status, page, pageSize, sort } = q.data;

    if (!projectId && !pageId) return res.status(400).json({ success: false, error: "projectId ou pageId requis" });

    const pid = toId(projectId || req.params.projectId);
    if (pid) {
      const userId = (req as any)?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
      if (policy?.canAccessProject) {
        const ok = await policy.canAccessProject(userId, pid, "VIEW");
        if (!ok) return res.status(403).json({ success: false, error: "Forbidden" });
      }
    }

    const where: any = {};
    if (projectId) where.projectId = toId(projectId) as any;
    if (pageId) where.pageId = toId(pageId) as any;
    if (type) where.type = type;
    if (status) where.status = status;

    const [sortField, sortDir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [sortField]: sortDir };

    const [total, items] = await Promise.all([
      prisma.export.count({ where }),
      prisma.export.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, select: exportSelect }),
    ]);

    res.json({ success: true, data: items.map(dto), pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (e: any) {
    console.error("❌ listExports error:", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ✅ Récupérer un export
export const getOne = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    const rec = await prisma.export.findUnique({ where: { id } as any, select: exportSelect });
    if (!rec) return res.status(404).json({ success: false, error: "Not found" });

    const userId = (req as any)?.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (policy?.canAccessProject) {
      const ok = await policy.canAccessProject(userId, rec.projectId, "VIEW");
      if (!ok) return res.status(403).json({ success: false, error: "Forbidden" });
    }

    res.json({ success: true, data: dto(rec) });
  } catch (e: any) {
    console.error("❌ getOneExport error:", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ✅ Marquer un export échoué
export const markFailed = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    const { error } = (req.body || {}) as { error?: string };

    const rec = await prisma.export.update({
      where: { id } as any,
      data: { status: "failed", meta: { ...(error ? { error } : {}) } },
      select: exportSelect,
    });

    emitEvent("export.failed", { exportId: rec.id, error });
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "EXPORT_FAILED", details: rec } });

    res.json({ success: true, data: dto(rec) });
  } catch (e: any) {
    console.error("❌ markFailed error:", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ✅ Marquer un export prêt
export const markReady = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    const { bundleUrl, meta } = (req.body || {}) as { bundleUrl?: string; meta?: any };
    if (!bundleUrl) return res.status(400).json({ success: false, error: "bundleUrl requis" });

    const rec = await prisma.export.update({
      where: { id } as any,
      data: { status: "ready", bundleUrl, meta: meta ?? {} },
      select: exportSelect,
    });

    emitEvent("export.ready", { exportId: rec.id, bundleUrl });
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "EXPORT_READY", details: rec } });

    res.json({ success: true, data: dto(rec) });
  } catch (e: any) {
    console.error("❌ markReady error:", e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
