import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  Types & Helpers
 * ========================================================================== */
export type ExportFormat = "html" | "flutter" | "json" | "react" | "vue" | "pdf";

interface ExportOptions {
  format: ExportFormat;
  projectId: string;
  outputDir?: string; // si défini -> sauvegarde fichiers
  userId?: string;    // pour audit log
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function safeName(name: string, ext: string, id: string) {
  const n = name?.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase() || "uinova_project";
  return `${n}_${id}.${ext}`;
}

/* ============================================================================
 *  Générateurs inline (peuvent être extraits plus tard)
 * ========================================================================== */
function generateHTML(project: any): string {
  const head = `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${project.name}</title>
    <style>
      body { font-family: sans-serif; margin: 0; padding: 0; background: #fafafa; color: #111; }
      section { padding: 1rem; border-bottom: 1px solid #ddd; }
      h1 { margin: 0 0 .5rem; }
    </style>
  `;
  return `<!DOCTYPE html>
<html lang="fr">
<head>${head}</head>
<body>
  ${project.pages.map((p: any) =>
    `<section id="${p.id}">
      <h1>${p.name}</h1>
      <div>${p.content || ""}</div>
    </section>`).join("\n")}
</body>
</html>`;
}

function generateFlutter(project: any): string {
  return `import 'package:flutter/material.dart';

void main() => runApp(const UInovaApp());

class UInovaApp extends StatelessWidget {
  const UInovaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${project.name}',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: Scaffold(
        appBar: AppBar(title: const Text('${project.name}')),
        body: ListView(
          children: <Widget>[
            ${project.pages.map((p: any) =>
              `ListTile(title: Text("${p.name}"), subtitle: Text("${p.content || ""}"))`
            ).join(",\n            ")}
          ],
        ),
      ),
    );
  }
}`;
}

function generateJSON(project: any): string {
  return JSON.stringify(project, null, 2);
}

function generateReact(project: any): string {
  return `import React from "react";

export default function ${project.name.replace(/[^a-zA-Z0-9]/g, "")}() {
  return (
    <div>
      ${project.pages.map((p: any) =>
        `<section key="${p.id}">
          <h1>${p.name}</h1>
          <p>${p.content || ""}</p>
        </section>`
      ).join("\n      ")}
    </div>
  );
}`;
}

function generateVue(project: any): string {
  return `<template>
  <div>
    ${project.pages.map((p: any) =>
      `<section id="${p.id}">
        <h1>${p.name}</h1>
        <p>${p.content || ""}</p>
      </section>`
    ).join("\n    ")}
  </div>
</template>

<script setup>
</script>`;
}

async function generatePDF(project: any, filePath: string) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(project.name, { x: 50, y: 750, size: 20, font, color: rgb(0, 0, 0) });
  let y = 720;
  for (const p of project.pages) {
    page.drawText(`${p.name}: ${p.content || ""}`, { x: 50, y, size: 12, font });
    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

/* ============================================================================
 *  Export principal
 * ========================================================================== */
export async function exportProject({
  format,
  projectId,
  outputDir,
  userId,
}: ExportOptions): Promise<{ path?: string; content: string }> {
  try {
    // 1. Charger projet + pages
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: true },
    });
    if (!project) throw new Error(`Project not found: ${projectId}`);
    if (!project.pages?.length) throw new Error(`Project ${projectId} has no pages to export`);

    // 2. Préparer répertoire
    const out = outputDir || path.join(process.cwd(), "exports");
    ensureDir(out);

    // 3. Générer contenu
    let content = "";
    let filePath: string | undefined;

    switch (format) {
      case "html":
        content = generateHTML(project);
        filePath = path.join(out, safeName(project.name, "html", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "flutter":
        content = generateFlutter(project);
        filePath = path.join(out, safeName(project.name, "dart", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "json":
        content = generateJSON(project);
        filePath = path.join(out, safeName(project.name, "json", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "react":
        content = generateReact(project);
        filePath = path.join(out, safeName(project.name, "tsx", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "vue":
        content = generateVue(project);
        filePath = path.join(out, safeName(project.name, "vue", projectId));
        fs.writeFileSync(filePath, content, "utf-8");
        break;
      case "pdf":
        filePath = path.join(out, safeName(project.name, "pdf", projectId));
        await generatePDF(project, filePath);
        content = fs.readFileSync(filePath).toString("base64");
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // 4. Audit enrichi
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "EXPORT_PROJECT",
        metadata: { projectId, format, pages: project.pages.length, filePath, ts: new Date().toISOString() },
      },
    });

    return { path: filePath, content };
  } catch (err: any) {
    console.error("❌ exportProject error:", err);
    throw new Error(err?.message || "Failed to export project");
  }
}
