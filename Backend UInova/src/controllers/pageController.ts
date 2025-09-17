// src/controllers/pageController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";

/* ============================================================================
 *  Schemas Validation (Zod)
 * ========================================================================== */
const PageCreateSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2).max(100),
  content: z.string().optional().default(""),
  type: z.enum(["landing", "editor", "custom"]).default("custom"),
});

const PageUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  content: z.string().optional(),
  type: z.enum(["landing", "editor", "custom"]).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

/* ============================================================================
 *  CRUD Pages
 * ========================================================================== */
export async function listPages(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const pages = await prisma.page.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { order: "asc" },
    });
    return res.json({ success: true, data: pages });
  } catch (err) {
    console.error("❌ listPages error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

export async function getPage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page || page.deletedAt) return res.status(404).json({ message: "Page introuvable" });
    return res.json({ success: true, data: page });
  } catch (err) {
    console.error("❌ getPage error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

export async function createPage(req: Request, res: Response) {
  try {
    const data = PageCreateSchema.parse(req.body);
    const order = await prisma.page.count({ where: { projectId: data.projectId } });

    const page = await prisma.page.create({ data: { ...data, order } });

    await prisma.auditLog.create({
      data: { action: "PAGE_CREATED", userId: (req as any).user?.id, details: `Page ${page.id} créée` },
    });

    return res.status(201).json({ success: true, data: page });
  } catch (err: any) {
    console.error("❌ createPage error:", err);
    return res.status(400).json({ message: err.message || "Erreur validation" });
  }
}

export async function updatePage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = PageUpdateSchema.parse(req.body);

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Page introuvable" });

    await prisma.pageVersion.create({
      data: {
        pageId: id,
        name: existing.name,
        content: existing.content,
        type: existing.type,
        status: existing.status,
      },
    });

    const page = await prisma.page.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: { action: "PAGE_UPDATED", userId: (req as any).user?.id, details: `Page ${id} mise à jour` },
    });

    return res.json({ success: true, data: page });
  } catch (err: any) {
    console.error("❌ updatePage error:", err);
    return res.status(400).json({ message: err.message || "Erreur mise à jour" });
  }
}

export async function deletePage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.page.update({ where: { id }, data: { deletedAt: new Date(), status: "archived" } });

    await prisma.auditLog.create({
      data: { action: "PAGE_DELETED", userId: (req as any).user?.id, details: `Page ${id} supprimée` },
    });

    return res.json({ success: true, message: "Page archivée" });
  } catch (err) {
    console.error("❌ deletePage error:", err);
    return res.status(500).json({ message: "Erreur suppression" });
  }
}

/* ============================================================================
 *  Fonctions avancées
 * ========================================================================== */
export async function duplicatePage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return res.status(404).json({ message: "Page introuvable" });

    const copy = await prisma.page.create({
      data: {
        projectId: page.projectId,
        name: `${page.name} (copie)`,
        content: page.content,
        type: page.type,
        status: "draft",
        order: page.order + 1,
      },
    });

    await prisma.auditLog.create({
      data: { action: "PAGE_DUPLICATED", userId: (req as any).user?.id, details: `Page ${id} dupliquée` },
    });

    return res.json({ success: true, data: copy });
  } catch (err) {
    console.error("❌ duplicatePage error:", err);
    return res.status(500).json({ message: "Erreur duplication" });
  }
}

export async function publishPage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const page = await prisma.page.update({ where: { id }, data: { status: "published" } });

    await prisma.auditLog.create({
      data: { action: "PAGE_PUBLISHED", userId: (req as any).user?.id, details: `Page ${id} publiée` },
    });

    return res.json({ success: true, data: page });
  } catch (err) {
    console.error("❌ publishPage error:", err);
    return res.status(500).json({ message: "Erreur publication" });
  }
}

export async function sharePage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return res.status(404).json({ message: "Page introuvable" });

    const shareToken = Buffer.from(`${id}-${Date.now()}`).toString("base64");

    await prisma.auditLog.create({
      data: { action: "PAGE_SHARED", userId: (req as any).user?.id, details: `Page ${id} partagée` },
    });

    return res.json({
      success: true,
      url: `${process.env.APP_URL}/preview/${shareToken}`,
    });
  } catch (err) {
    console.error("❌ sharePage error:", err);
    return res.status(500).json({ message: "Erreur partage" });
  }
}

export async function rollbackPage(req: Request, res: Response) {
  try {
    const { id, versionId } = req.params;
    const version = await prisma.pageVersion.findUnique({ where: { id: versionId } });
    if (!version) return res.status(404).json({ message: "Version introuvable" });

    const restored = await prisma.page.update({
      where: { id },
      data: {
        name: version.name,
        content: version.content,
        type: version.type,
        status: "draft",
      },
    });

    await prisma.auditLog.create({
      data: { action: "PAGE_ROLLBACK", userId: (req as any).user?.id, details: `Page ${id} rollback vers version ${versionId}` },
    });

    return res.json({ success: true, data: restored });
  } catch (err) {
    console.error("❌ rollbackPage error:", err);
    return res.status(500).json({ message: "Erreur rollback" });
  }
}

export async function reorderPages(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({ message: "Format ordre invalide" });
    }

    for (const o of order) {
      await prisma.page.update({ where: { id: o.id }, data: { order: o.position } });
    }

    await prisma.auditLog.create({
      data: { action: "PAGES_REORDERED", userId: (req as any).user?.id, details: `Réorganisation pages projet ${projectId}` },
    });

    return res.json({ success: true, message: "Ordre mis à jour" });
  } catch (err) {
    console.error("❌ reorderPages error:", err);
    return res.status(500).json({ message: "Erreur réorganisation" });
  }
}

/* ============================================================================
 *  Export Multi-format
 * ========================================================================== */
export async function exportPage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || "json";
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return res.status(404).json({ message: "Page introuvable" });

    switch (format) {
      case "json":
        return res.json({ success: true, data: page });

      case "html":
        return res.type("html").send(
          `<!DOCTYPE html><html><head><title>${page.name}</title></head><body>${page.content}</body></html>`
        );

      case "md":
      case "markdown":
        return res.type("text/markdown").send(`# ${page.name}\n\n${page.content}`);

      case "react":
        return res.type("text/jsx").send(
          `import React from "react";\n\nexport default function ${page.name.replace(/\W+/g, "")}() {\n  return (\n    <div className="page">\n      <h1>${page.name}</h1>\n      <div dangerouslySetInnerHTML={{ __html: \`${page.content}\` }} />\n    </div>\n  );\n}`
        );

      case "vue":
        return res.type("text/vue").send(
          `<template>\n  <div class="page">\n    <h1>${page.name}</h1>\n    <div v-html="content"></div>\n  </div>\n</template>\n\n<script>\nexport default {\n  name: "${page.name.replace(/\W+/g, "")}",\n  data() {\n    return { content: \`${page.content}\` };\n  }\n}\n</script>`
        );

      case "flutter":
        return res.type("text/dart").send(
          `import 'package:flutter/material.dart';\n\nclass ${page.name.replace(/\W+/g, "")}Page extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return Scaffold(\n      appBar: AppBar(title: Text('${page.name}')),\n      body: SingleChildScrollView(\n        padding: EdgeInsets.all(16),\n        child: Text('${page.content.replace(/'/g, "\\'")}'),\n      ),\n    );\n  }\n}`
        );

      default:
        return res.status(400).json({ message: "Format non supporté" });
    }
  } catch (err) {
    console.error("❌ exportPage error:", err);
    return res.status(500).json({ message: "Erreur export" });
  }
}
