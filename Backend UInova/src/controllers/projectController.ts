// src/controllers/projectController.ts
import { Response, Request } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { toProjectCardDTO } from "../utils/dto";
import * as policy from "../services/policy";
import crypto from "crypto";
import { emitEvent } from "../services/eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const metrics = {
  created: new client.Counter({
    name: "uinova_projects_created_total",
    help: "Nombre total de projets créés",
  }),
  updated: new client.Counter({
    name: "uinova_projects_updated_total",
    help: "Nombre total de projets mis à jour",
  }),
  deleted: new client.Counter({
    name: "uinova_projects_deleted_total",
    help: "Nombre total de projets supprimés/archivés",
  }),
  restored: new client.Counter({
    name: "uinova_projects_restored_total",
    help: "Nombre total de projets restaurés",
  }),
  duplicated: new client.Counter({
    name: "uinova_projects_duplicated_total",
    help: "Nombre total de projets dupliqués",
  }),
  published: new client.Counter({
    name: "uinova_projects_published_total",
    help: "Nombre total de projets publiés",
  }),
  exported: new client.Counter({
    name: "uinova_projects_exported_total",
    help: "Nombre total de projets exportés",
  }),
  rollback: new client.Counter({
    name: "uinova_projects_rollback_total",
    help: "Nombre total de projets rollbackés",
  }),
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function ensureAuth(req: Request) {
  const u = (req as any).user;
  if (!u?.sub && !u?.id) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return { id: u.sub || u.id, role: u.role || "USER" };
}

async function ensureCanAccessProject(userId: string, projectId: string, need: "VIEW" | "EDIT") {
  if (policy?.canAccessProject) {
    const ok = await policy.canAccessProject(userId, projectId, need);
    if (!ok) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    return;
  }
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!p || p.ownerId !== userId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

async function logAction(userId: string, action: string, metadata?: any) {
  try {
    await prisma.auditLog.create({ data: { userId, action, metadata } });
  } catch (err) {
    logger.warn("⚠️ Audit log failed", err);
  }
}

/* ============================================================================
 * VALIDATION SCHEMAS
 * ========================================================================== */
const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional(),
  icon: z.string().max(120).optional(),
  schema: z.any().optional(),
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).optional().or(z.literal(null)),
  icon: z.string().max(120).optional().or(z.literal(null)),
  schema: z.any().optional(),
});

const AutosaveSchema = z.object({
  schema: z.any(),
});

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// ✅ Lister mes projets avec pagination & recherche
export const listProjects = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.q ? String(req.query.q) : undefined;

    const where: any = { ownerId: user.id, deletedAt: null };
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          tagline: true,
          icon: true,
          status: true,
          updatedAt: true,
          published: true,
          lastSavedAt: true,
        },
      }),
    ]);

    await logAction(user.id, "PROJECT_LIST", { total });
    res.json({
      success: true,
      data: projects.map(toProjectCardDTO),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    logger.error("❌ listProjects", err);
    res.status(500).json({ success: false, error: "Erreur récupération projets" });
  }
};

// ✅ Créer un projet
export const createProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const body = CreateSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ownerId: user.id,
        name: body.name,
        tagline: body.tagline ?? null,
        icon: body.icon ?? null,
        status: "DRAFT",
        json: body.schema ?? {},
      },
    });

    metrics.created.inc();
    emitEvent("project.created", { projectId: project.id, userId: user.id });
    await logAction(user.id, "PROJECT_CREATE", { projectId: project.id });

    res.status(201).json({ success: true, data: toProjectCardDTO(project) });
  } catch (err: any) {
    logger.error("❌ createProject", err);
    res.status(500).json({ success: false, error: "Erreur création projet" });
  }
};

// ✅ Récupérer un projet
export const getProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { pages: true, versions: true },
    });
    if (!project) return res.status(404).json({ success: false, error: "Not found" });

    await ensureCanAccessProject(user.id, project.id, "VIEW");
    await logAction(user.id, "PROJECT_VIEW", { projectId: project.id });

    res.json({ success: true, data: project });
  } catch (err: any) {
    logger.error("❌ getProject", err);
    res.status(500).json({ success: false, error: "Erreur récupération projet" });
  }
};

// ✅ Mettre à jour un projet
export const updateProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const body = UpdateSchema.parse(req.body);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    // snapshot version
    const current = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (current) {
      await prisma.projectVersion.create({
        data: { projectId: current.id, snapshot: current.json, name: `${current.name}@${Date.now()}` },
      });
    }

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: { ...body, updatedAt: new Date() },
    });

    metrics.updated.inc();
    emitEvent("project.updated", { projectId: updated.id, userId: user.id });
    await logAction(user.id, "PROJECT_UPDATE", { projectId: updated.id });

    res.json({ success: true, data: toProjectCardDTO(updated) });
  } catch (err: any) {
    logger.error("❌ updateProject", err);
    res.status(500).json({ success: false, error: "Erreur mise à jour projet" });
  }
};

// ✅ Rollback projet
export const rollbackProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const { versionId } = req.params;

    const version = await prisma.projectVersion.findUnique({ where: { id: versionId } });
    if (!version) return res.status(404).json({ success: false, error: "Version introuvable" });

    await ensureCanAccessProject(user.id, version.projectId, "EDIT");

    const rolled = await prisma.project.update({
      where: { id: version.projectId },
      data: { json: version.snapshot, updatedAt: new Date() },
    });

    metrics.rollback.inc();
    emitEvent("project.rollback", { projectId: rolled.id, versionId, userId: user.id });
    await logAction(user.id, "PROJECT_ROLLBACK", { projectId: rolled.id, versionId });

    res.json({ success: true, data: rolled });
  } catch (err: any) {
    logger.error("❌ rollbackProject", err);
    res.status(500).json({ success: false, error: "Erreur rollback projet" });
  }
};

// ✅ Supprimer un projet (soft delete)
export const removeProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    await prisma.project.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    metrics.deleted.inc();
    emitEvent("project.deleted", { projectId: req.params.id, userId: user.id });
    await logAction(user.id, "PROJECT_DELETE", { projectId: req.params.id });

    res.json({ success: true, message: "Projet archivé" });
  } catch (err: any) {
    logger.error("❌ removeProject", err);
    res.status(500).json({ success: false, error: "Erreur suppression projet" });
  }
};

// ✅ Restaurer un projet archivé
export const restoreProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const restored = await prisma.project.update({
      where: { id: req.params.id },
      data: { deletedAt: null, status: "DRAFT" },
    });

    metrics.restored.inc();
    emitEvent("project.restored", { projectId: restored.id, userId: user.id });
    await logAction(user.id, "PROJECT_RESTORE", { projectId: restored.id });

    res.json({ success: true, data: toProjectCardDTO(restored) });
  } catch (err: any) {
    logger.error("❌ restoreProject", err);
    res.status(500).json({ success: false, error: "Erreur restauration projet" });
  }
};

// ✅ Partager un projet (lien public)
export const shareProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "VIEW");

    const link = await prisma.shareLink.create({
      data: {
        projectId: req.params.id,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    emitEvent("project.shared", { projectId: req.params.id, token: link.token, userId: user.id });
    await logAction(user.id, "PROJECT_SHARE", { projectId: req.params.id, token: link.token });

    res.json({ success: true, url: `${process.env.FRONTEND_URL}/preview/${link.token}` });
  } catch (err: any) {
    logger.error("❌ shareProject", err);
    res.status(500).json({ success: false, error: "Erreur partage projet" });
  }
};
