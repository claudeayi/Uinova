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
 * 📊 Metrics
 * ========================================================================== */
const metrics = {
  created: new client.Counter({ name: "uinova_projects_created_total", help: "Projets créés" }),
  updated: new client.Counter({ name: "uinova_projects_updated_total", help: "Projets mis à jour" }),
  deleted: new client.Counter({ name: "uinova_projects_deleted_total", help: "Projets supprimés" }),
  restored: new client.Counter({ name: "uinova_projects_restored_total", help: "Projets restaurés" }),
  duplicated: new client.Counter({ name: "uinova_projects_duplicated_total", help: "Projets dupliqués" }),
  published: new client.Counter({ name: "uinova_projects_published_total", help: "Projets publiés" }),
  exported: new client.Counter({ name: "uinova_projects_exported_total", help: "Projets exportés" }),
  rollback: new client.Counter({ name: "uinova_projects_rollback_total", help: "Projets rollbackés" }),
  versions: new client.Counter({ name: "uinova_projects_versions_total", help: "Versions sauvegardées" }),
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
 * VERSIONING HELPERS
 * ========================================================================== */
async function createProjectVersion(projectId: string, userId: string, tag?: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const hash = crypto.createHash("sha256").update(JSON.stringify(project.json)).digest("hex");

  const version = await prisma.projectVersion.create({
    data: { projectId, userId, snapshot: project.json, hash, tag },
  });

  metrics.versions.inc();
  emitEvent("project.versioned", { projectId, versionId: version.id, tag });
  await logAction(userId, "PROJECT_VERSION_CREATED", { projectId, versionId: version.id, tag });

  return version;
}

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const CreateSchema = z.object({ name: z.string().min(1).max(120), tagline: z.string().max(200).optional(), icon: z.string().max(120).optional(), schema: z.any().optional() });
const UpdateSchema = z.object({ name: z.string().min(1).max(120).optional(), tagline: z.string().max(200).optional().or(z.literal(null)), icon: z.string().max(120).optional().or(z.literal(null)), schema: z.any().optional() });
const AutosaveSchema = z.object({ schema: z.any() });

/* ============================================================================
 * CONTROLLERS – Versions
 * ========================================================================== */

// ✅ Sauvegarde une version manuelle
export const saveVersion = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const { tag } = req.body;
    const version = await createProjectVersion(req.params.id, user.id, tag);

    res.status(201).json({ success: true, data: version });
  } catch (err: any) {
    logger.error("❌ saveVersion", err);
    res.status(500).json({ success: false, error: "Erreur sauvegarde version" });
  }
};

// ✅ Lister toutes les versions d’un projet
export const listVersions = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "VIEW");

    const versions = await prisma.projectVersion.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: versions });
  } catch (err: any) {
    logger.error("❌ listVersions", err);
    res.status(500).json({ success: false, error: "Erreur récupération versions" });
  }
};

// ✅ Rollback vers une version
export const rollbackToVersion = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const { versionId } = req.params;
    const version = await prisma.projectVersion.findUnique({ where: { id: versionId } });
    if (!version) return res.status(404).json({ success: false, error: "Version introuvable" });

    const rollback = await prisma.project.update({
      where: { id: req.params.id },
      data: { json: version.snapshot, updatedAt: new Date() },
    });

    await createProjectVersion(req.params.id, user.id, `rollback_from_${versionId}`);
    metrics.rollback.inc();
    emitEvent("project.rollback", { projectId: req.params.id, versionId });
    await logAction(user.id, "PROJECT_ROLLBACK", { projectId: req.params.id, versionId });

    res.json({ success: true, data: rollback });
  } catch (err: any) {
    logger.error("❌ rollbackToVersion", err);
    res.status(500).json({ success: false, error: "Erreur rollback projet" });
  }
};
