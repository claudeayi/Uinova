// src/controllers/projectController.ts
import { Response, Request } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { toProjectCardDTO } from "../utils/dto";
import * as policy from "../services/policy";

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

async function ensureCanAccessProject(
  userId: string,
  projectId: string,
  need: "VIEW" | "EDIT"
) {
  if (policy?.canAccessProject) {
    const ok = await policy.canAccessProject(userId, projectId, need);
    if (!ok) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    return;
  }
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!p || p.ownerId !== userId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
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

// GET /api/projects
export const listProjects = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      tagline: true,
      icon: true,
      status: true,
      updatedAt: true,
    },
  });
  res.json(projects.map(toProjectCardDTO));
};

// POST /api/projects
export const createProject = async (req: Request, res: Response) => {
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

  res.status(201).json(toProjectCardDTO(project));
};

// GET /api/projects/:id
export const getProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { pages: true },
  });
  if (!project) return res.status(404).json({ error: "Not found" });

  await ensureCanAccessProject(user.id, project.id, "VIEW");
  res.json(project);
};

// PATCH /api/projects/:id
export const updateProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const body = UpdateSchema.parse(req.body);
  await ensureCanAccessProject(user.id, req.params.id, "EDIT");

  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...body,
      updatedAt: new Date(),
    },
  });
  res.json(toProjectCardDTO(updated));
};

// DELETE /api/projects/:id
export const removeProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  await ensureCanAccessProject(user.id, req.params.id, "EDIT");

  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

// POST /api/projects/:id/duplicate
export const duplicateProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const src = await prisma.project.findUnique({
    where: { id: req.params.id },
  });
  if (!src) return res.status(404).json({ error: "Not found" });

  await ensureCanAccessProject(user.id, src.id, "VIEW");

  const copy = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: `${src.name} (copie)`,
      tagline: src.tagline,
      icon: src.icon,
      status: src.status,
      json: src.json,
    },
  });

  res.status(201).json(toProjectCardDTO(copy));
};

// PATCH /api/projects/:id/autosave
export const autosaveProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const { schema } = AutosaveSchema.parse(req.body);
  await ensureCanAccessProject(user.id, req.params.id, "EDIT");

  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: { json: schema, lastSavedAt: new Date() },
  });
  res.json({ ok: true, updatedAt: updated.updatedAt });
};

// GET /api/projects/:id/export
export const exportProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  await ensureCanAccessProject(user.id, req.params.id, "VIEW");

  const { format = "json" } = req.query;
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
  });
  if (!project) return res.status(404).json({ error: "Not found" });

  if (format === "json") {
    res.json(project.json);
  } else if (format === "html") {
    res.type("html").send(`<!DOCTYPE html><html><body><pre>${JSON.stringify(project.json, null, 2)}</pre></body></html>`);
  } else if (format === "flutter") {
    res.json({ code: "// TODO: générer Flutter à partir du schema" });
  } else {
    res.status(400).json({ error: "Format non supporté" });
  }
};

// POST /api/projects/:id/deploy
export const deployProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  await ensureCanAccessProject(user.id, req.params.id, "EDIT");

  // Mock déploiement
  const deploy = await prisma.deployment.create({
    data: { projectId: req.params.id, status: "PENDING" },
  });
  res.status(202).json({ ok: true, deploymentId: deploy.id });
};

// GET /api/projects/:id/replay
export const getReplay = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  await ensureCanAccessProject(user.id, req.params.id, "VIEW");

  const sessions = await prisma.replaySession.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(sessions);
};

// POST /api/projects/:id/share
export const shareProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  await ensureCanAccessProject(user.id, req.params.id, "VIEW");

  const link = await prisma.shareLink.create({
    data: {
      projectId: req.params.id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
    },
  });
  res.json({ url: `${process.env.FRONTEND_URL}/preview/${link.token}` });
};

// POST /api/projects/:id/publish
export const publishProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  await ensureCanAccessProject(user.id, req.params.id, "EDIT");

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { published: true },
  });
  res.json({ ok: true, id: project.id });
};
