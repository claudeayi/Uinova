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
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${project.name}</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 0; }
  </style>
</head>
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
  // Récupère le projet et ses pages
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { pages: true },
  });
  if (!project) throw new Error("Project not found");

  let content = "";
  if (format === "html") content = generateHTML(project);
  else if (format === "flutter") content = generateFlutter(project);
  else content = generateJSON(project);

  let filePath: string | undefined;
  if (outputDir) {
    ensureDir(outputDir);
    const ext = format === "json" ? "json" : format === "flutter" ? "dart" : "html";
    filePath = path.join(outputDir, `${project.name}_${projectId}.${ext}`);
    fs.writeFileSync(filePath, content, "utf-8");
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: userId || null,
      action: "EXPORT_PROJECT",
      details: `Exported project ${projectId} as ${format}`,
    },
  });

  return { path: filePath, content };
}
