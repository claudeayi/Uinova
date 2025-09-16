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
  viewed: new client.Counter({ name: "uinova_projects_viewed_total", help: "Projets consultés" }),
  reactions: new client.Counter({ name: "uinova_projects_reactions_total", help: "Réactions sur projets" }),
  comments: new client.Counter({ name: "uinova_projects_comments_total", help: "Commentaires sur projets" }),
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
 * VALIDATION
 * ========================================================================== */
const CreateSchema = z.object({ name: z.string().min(1).max(120), tagline: z.string().max(200).optional(), icon: z.string().max(120).optional(), schema: z.any().optional() });
const UpdateSchema = z.object({ name: z.string().min(1).max(120).optional(), tagline: z.string().max(200).optional().or(z.literal(null)), icon: z.string().max(120).optional().or(z.literal(null)), schema: z.any().optional() });
const AutosaveSchema = z.object({ schema: z.any() });

/* ============================================================================
 * EXPORT HELPERS
 * ========================================================================== */
function generateReactCode(project: any) {
  return `import React from "react";
export default function App() {
  return (
    <div>
      <h1>${project.name}</h1>
      ${project.pages.map((p: any) => `<section><h2>${p.name}</h2><p>${p.content || ""}</p></section>`).join("\n")}
    </div>
  );
}`;
}

function generateFlutterCode(project: any) {
  return `import 'package:flutter/material.dart';
void main() => runApp(const UInovaApp());
class UInovaApp extends StatelessWidget {
  const UInovaApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${project.name}',
      home: Scaffold(
        appBar: AppBar(title: const Text('${project.name}')),
        body: ListView(
          children: [
            ${project.pages.map((p: any) => `ListTile(title: Text("${p.name}"), subtitle: Text("${p.content || ""}"))`).join(",")}
          ],
        ),
      ),
    );
  }
}`;
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// ✅ Lister projets
export const listProjects = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const projects = await prisma.project.findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true, published: true, lastSavedAt: true },
    });
    res.json({ success: true, data: projects.map(toProjectCardDTO) });
  } catch (err: any) {
    logger.error("❌ listProjects", err);
    res.status(500).json({ success: false, error: "Erreur récupération projets" });
  }
};

// ✅ Créer projet
export const createProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const body = CreateSchema.parse(req.body);

    const project = await prisma.project.create({
      data: { ownerId: user.id, name: body.name, tagline: body.tagline ?? null, icon: body.icon ?? null, status: "DRAFT", json: body.schema ?? {} },
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

// ✅ Export projet (JSON | HTML | React | Flutter)
export const exportProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "VIEW");

    const { format = "json" } = req.query;
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { pages: true } });
    if (!project) return res.status(404).json({ success: false, error: "Not found" });

    let payload: any;
    switch (format) {
      case "json": payload = { success: true, data: project.json }; break;
      case "html": res.type("html"); payload = `<!DOCTYPE html><html><body><h1>${project.name}</h1><script>window.project=${JSON.stringify(project.json)}</script></body></html>`; break;
      case "react": payload = { success: true, code: generateReactCode(project) }; break;
      case "flutter": payload = { success: true, code: generateFlutterCode(project) }; break;
      default: return res.status(400).json({ success: false, error: "Format non supporté" });
    }

    metrics.exported.inc();
    emitEvent("project.exported", { projectId: project.id, format, userId: user.id });
    await logAction(user.id, "PROJECT_EXPORT", { projectId: project.id, format });

    if (typeof payload === "string") res.send(payload);
    else res.json(payload);
  } catch (err: any) {
    logger.error("❌ exportProject", err);
    res.status(500).json({ success: false, error: "Erreur export projet" });
  }
};

// ✅ Vue publique (shareLink)
export const viewSharedProject = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const link = await prisma.shareLink.findUnique({ where: { token }, include: { project: { include: { pages: true } } } });
    if (!link || link.expiresAt < new Date()) {
      return res.status(404).json({ success: false, error: "Lien expiré ou invalide" });
    }
    metrics.viewed.inc();
    emitEvent("project.viewed", { projectId: link.projectId, token });
    await logAction("anonymous", "PROJECT_VIEW_SHARED", { projectId: link.projectId, token });

    res.json({ success: true, data: link.project });
  } catch (err: any) {
    logger.error("❌ viewSharedProject", err);
    res.status(500).json({ success: false, error: "Erreur vue partagée" });
  }
};

// ✅ Réagir à un projet
export const reactToProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const { type } = req.body; // "like" | "star" | "dislike"
    if (!["like", "star", "dislike"].includes(type)) {
      return res.status(400).json({ success: false, error: "Type de réaction invalide" });
    }

    const reaction = await prisma.projectReaction.upsert({
      where: { userId_projectId: { userId: user.id, projectId: req.params.id } },
      update: { type },
      create: { userId: user.id, projectId: req.params.id, type },
    });

    metrics.reactions.inc();
    emitEvent("project.reacted", { projectId: req.params.id, type, userId: user.id });
    await logAction(user.id, "PROJECT_REACT", { projectId: req.params.id, type });

    res.json({ success: true, data: reaction });
  } catch (err: any) {
    logger.error("❌ reactToProject", err);
    res.status(500).json({ success: false, error: "Erreur réaction projet" });
  }
};

// ✅ Commentaires
export const commentOnProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ success: false, error: "Message requis" });

    const comment = await prisma.projectComment.create({
      data: { projectId: req.params.id, userId: user.id, content, parentId: parentId || null },
    });

    metrics.comments.inc();
    emitEvent("project.commented", { projectId: req.params.id, commentId: comment.id, userId: user.id });
    await logAction(user.id, "PROJECT_COMMENT", { projectId: req.params.id, commentId: comment.id });

    res.status(201).json({ success: true, data: comment });
  } catch (err: any) {
    logger.error("❌ commentOnProject", err);
    res.status(500).json({ success: false, error: "Erreur commentaire" });
  }
};
