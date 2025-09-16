// src/controllers/projectController.ts
import { Response, Request } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { toProjectCardDTO } from "../utils/dto";
import * as policy from "../services/policy";
import crypto from "crypto";

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

async function saveVersionInternal(projectId: string, userId: string, reason: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  return prisma.projectVersion.create({
    data: {
      projectId,
      userId,
      snapshot: project.json,
      reason,
    },
  });
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
 * CONTROLLERS EXISTANTS
 * ========================================================================== */

// ✅ Lister mes projets
export const listProjects = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const projects = await prisma.project.findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
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
    });
    res.json({ success: true, data: projects.map(toProjectCardDTO) });
  } catch (err: any) {
    console.error("❌ listProjects:", err);
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

    await saveVersionInternal(project.id, user.id, "Initial creation");

    res.status(201).json({ success: true, data: toProjectCardDTO(project) });
  } catch (err: any) {
    console.error("❌ createProject:", err);
    res.status(500).json({ success: false, error: "Erreur création projet" });
  }
};

// ✅ Récupérer un projet
export const getProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { pages: true },
    });
    if (!project) return res.status(404).json({ success: false, error: "Not found" });

    await ensureCanAccessProject(user.id, project.id, "VIEW");
    res.json({ success: true, data: project });
  } catch (err: any) {
    console.error("❌ getProject:", err);
    res.status(500).json({ success: false, error: "Erreur récupération projet" });
  }
};

// ✅ Mettre à jour un projet
export const updateProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const body = UpdateSchema.parse(req.body);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const before = await prisma.project.findUnique({ where: { id: req.params.id } });

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: { ...body, updatedAt: new Date() },
    });

    if (before) await saveVersionInternal(updated.id, user.id, "Manual update");

    res.json({ success: true, data: toProjectCardDTO(updated) });
  } catch (err: any) {
    console.error("❌ updateProject:", err);
    res.status(500).json({ success: false, error: "Erreur mise à jour projet" });
  }
};

// ✅ Autosave
export const autosaveProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const { schema } = AutosaveSchema.parse(req.body);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const before = await prisma.project.findUnique({ where: { id: req.params.id } });

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: { json: schema, lastSavedAt: new Date() },
    });

    if (before) await saveVersionInternal(updated.id, user.id, "Autosave");

    res.json({ success: true, updatedAt: updated.updatedAt });
  } catch (err: any) {
    console.error("❌ autosaveProject:", err);
    res.status(500).json({ success: false, error: "Erreur autosave" });
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
    res.json({ success: true, message: "Projet archivé" });
  } catch (err: any) {
    console.error("❌ removeProject:", err);
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
    res.json({ success: true, data: toProjectCardDTO(restored) });
  } catch (err: any) {
    console.error("❌ restoreProject:", err);
    res.status(500).json({ success: false, error: "Erreur restauration projet" });
  }
};

// ✅ Dupliquer un projet
export const duplicateProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const src = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!src) return res.status(404).json({ success: false, error: "Not found" });

    await ensureCanAccessProject(user.id, src.id, "VIEW");

    const copy = await prisma.project.create({
      data: {
        ownerId: user.id,
        name: `${src.name} (copie)`,
        tagline: src.tagline,
        icon: src.icon,
        status: "DRAFT",
        json: src.json,
      },
    });

    await saveVersionInternal(copy.id, user.id, "Duplicated project");

    res.status(201).json({ success: true, data: toProjectCardDTO(copy) });
  } catch (err: any) {
    console.error("❌ duplicateProject:", err);
    res.status(500).json({ success: false, error: "Erreur duplication projet" });
  }
};

// ✅ Exporter un projet (JSON, HTML, React, Vue, Flutter, PWA)
export const exportProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "VIEW");

    const { format = "json" } = req.query;
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ success: false, error: "Not found" });

    switch (format) {
      case "json":
        return res.json({ success: true, data: project.json });
      case "html":
        return res.type("html").send(
          `<!DOCTYPE html><html><body><script>window.project=${JSON.stringify(project.json)}</script></body></html>`
        );
      case "react":
        return res.json({ success: true, code: `// TODO: Générer code React pour ${project.name}` });
      case "vue":
        return res.json({ success: true, code: `<!-- TODO: Générer code Vue pour ${project.name} -->` });
      case "flutter":
        return res.json({ success: true, code: "// TODO: générer Flutter à partir du schema" });
      case "pwa":
        return res.json({ success: true, manifest: { name: project.name, short_name: project.name, start_url: ".", display: "standalone" } });
      default:
        return res.status(400).json({ success: false, error: "Format non supporté" });
    }
  } catch (err: any) {
    console.error("❌ exportProject:", err);
    res.status(500).json({ success: false, error: "Erreur export projet" });
  }
};

// ✅ Déploiement (mock)
export const deployProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const deploy = await prisma.deployment.create({
      data: { projectId: req.params.id, status: "PENDING" },
    });
    res.status(202).json({ success: true, deploymentId: deploy.id });
  } catch (err: any) {
    console.error("❌ deployProject:", err);
    res.status(500).json({ success: false, error: "Erreur déploiement projet" });
  }
};

// ✅ Replays associés
export const getReplay = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "VIEW");

    const sessions = await prisma.replaySession.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: sessions });
  } catch (err: any) {
    console.error("❌ getReplay:", err);
    res.status(500).json({ success: false, error: "Erreur récupération replays" });
  }
};

// ✅ Partager un projet
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
    res.json({ success: true, url: `${process.env.FRONTEND_URL}/preview/${link.token}` });
  } catch (err: any) {
    console.error("❌ shareProject:", err);
    res.status(500).json({ success: false, error: "Erreur partage projet" });
  }
};

// ✅ Publier un projet
export const publishProject = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { published: true },
    });
    res.json({ success: true, id: project.id });
  } catch (err: any) {
    console.error("❌ publishProject:", err);
    res.status(500).json({ success: false, error: "Erreur publication projet" });
  }
};

/* ============================================================================
 * NEW ENDPOINTS – VERSIONNING
 * ========================================================================== */

// ✅ Sauvegarder manuellement une version
export const saveVersion = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "EDIT");

    const version = await saveVersionInternal(req.params.id, user.id, "Manual save");
    res.status(201).json({ success: true, data: version });
  } catch (err: any) {
    console.error("❌ saveVersion:", err);
    res.status(500).json({ success: false, error: "Erreur sauvegarde version" });
  }
};

// ✅ Lister les versions d’un projet
export const listVersions = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    await ensureCanAccessProject(user.id, req.params.id, "VIEW");

    const versions = await prisma.projectVersion.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ success: true, data: versions });
  } catch (err: any) {
    console.error("❌ listVersions:", err);
    res.status(500).json({ success: false, error: "Erreur récupération versions" });
  }
};

// ✅ Rollback vers une version
export const rollbackToVersion = async (req: Request, res: Response) => {
  try {
    const user = ensureAuth(req);
    const { versionId } = req.params;
    if (!versionId) return res.status(400).json({ success: false, error: "versionId manquant" });

    const version = await prisma.projectVersion.findUnique({ where: { id: versionId } });
    if (!version) return res.status(404).json({ success: false, error: "Version introuvable" });

    await ensureCanAccessProject(user.id, version.projectId, "EDIT");

    const updated = await prisma.project.update({
      where: { id: version.projectId },
      data: { json: version.snapshot, updatedAt: new Date() },
    });

    await saveVersionInternal(updated.id, user.id, `Rollback vers version ${versionId}`);

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("❌ rollbackToVersion:", err);
    res.status(500).json({ success: false, error: "Erreur rollback version" });
  }
};
