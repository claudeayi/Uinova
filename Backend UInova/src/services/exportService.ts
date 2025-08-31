// src/services/exportService.ts
import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  Types & Helpers
 * ========================================================================== */
export type ExportFormat = "html" | "flutter" | "json";

interface ExportOptions {
  format: ExportFormat;
  projectId: string;
  outputDir?: string; // si défini -> sauvegarde fichiers
  userId?: string;    // pour audit log
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/* ============================================================================
 *  Générateurs
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
  ${project.pages
    .map(
      (p: any) =>
        `<section id="${p.id}">
          <h1>${p.name}</h1>
          <div>${p.content || ""}</div>
        </section>`
    )
    .join("\n")}
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
            ${project.pages
              .map(
                (p: any) =>
                  `ListTile(title: Text("${p.name}"), subtitle: Text("${p.content || ""}"))`
              )
              .join(",\n            ")}
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
    // 1. Récupérer projet + pages
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: true },
    });
    if (!project) throw new Error(`Project not found: ${projectId}`);
    if (!project.pages || project.pages.length === 0) {
      throw new Error(`Project ${projectId} has no pages to export`);
    }

    // 2. Générer le contenu
    let content = "";
    if (format === "html") content = generateHTML(project);
    else if (format === "flutter") content = generateFlutter(project);
    else content = generateJSON(project);

    // 3. Sauvegarde éventuelle
    let filePath: string | undefined;
    const safeOutput = outputDir || path.join(process.cwd(), "exports");
    if (safeOutput) {
      ensureDir(safeOutput);
      const ext = format === "json" ? "json" : format === "flutter" ? "dart" : "html";
      const safeName = project.name?.replace(/[^a-z0-9_-]+/gi, "_") || "uinova_project";
      filePath = path.join(safeOutput, `${safeName}_${projectId}.${ext}`);
      fs.writeFileSync(filePath, content, "utf-8");
    }

    // 4. Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "EXPORT_PROJECT",
        details: JSON.stringify({
          projectId,
          format,
          pages: project.pages.length,
          filePath: filePath || "in-memory",
          ts: new Date().toISOString(),
        }),
      },
    });

    return { path: filePath, content };
  } catch (err: any) {
    console.error("❌ exportProject error:", err);
    throw new Error(err?.message || "Failed to export project");
  }
}
