// src/services/exportService.ts
import JSZip from "jszip";
import fs from "fs";
import path from "path";

/* ============================================================================
 * Types (adapte si besoin à ton schéma réel)
 * ========================================================================== */
export type UINovaElement = {
  id: string;
  type: string;
  props?: Record<string, any>;
  children?: UINovaElement[];
};

export type UINovaPage = {
  id: string | number;
  name: string;
  path?: string;
  elements?: UINovaElement[];
  css?: string;
  meta?: { title?: string; description?: string };
};

export type UINovaProject = {
  id: string | number;
  name: string;
  tagline?: string;
  icon?: string | null;
  pages?: UINovaPage[];
  css?: string;
};

export type ExportFormat = "html" | "json" | "flutter";

export type ExportOptions = {
  format: ExportFormat;
  minify?: boolean;
  includeReadme?: boolean;
  includeRobots?: boolean;
  includeSitemap?: boolean;
  pretty?: boolean;
  outputDirName?: string;
  assetsDir?: string;
  saveToDisk?: string; // chemin optionnel pour sauvegarder le zip
  onAudit?: (action: string, details: any) => Promise<void> | void;
};

/* ============================================================================
 * Utils
 * ========================================================================== */
function slugify(s: string): string {
  return (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "page";
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveText(el: UINovaElement): string {
  const txt = el.props?.text ?? el.props?.label ?? el.props?.value ?? el.type;
  return escapeHtml(String(txt));
}

/* ============================================================================
 * Rendu HTML simple pour chaque élément
 * ========================================================================== */
function renderElement(el: UINovaElement): string {
  switch (el.type) {
    case "text":
      return `<p>${resolveText(el)}</p>`;
    case "title":
    case "heading":
      return `<h2>${resolveText(el)}</h2>`;
    case "image": {
      const src = el.props?.src || "";
      const alt = escapeHtml(el.props?.alt || "");
      return `<img src="${src}" alt="${alt}" />`;
    }
    case "button": {
      const label = resolveText(el);
      const href = el.props?.href || "#";
      return `<a class="btn" href="${href}">${label}</a>`;
    }
    case "container":
    case "section": {
      const children = (el.children || []).map(renderElement).join("\n");
      return `<section class="section">${children}</section>`;
    }
    case "row": {
      const children = (el.children || []).map(renderElement).join("\n");
      return `<div class="row">${children}</div>`;
    }
    case "column": {
      const children = (el.children || []).map(renderElement).join("\n");
      return `<div class="col">${children}</div>`;
    }
    default: {
      const children = (el.children || []).map(renderElement).join("\n");
      return `<div data-type="${escapeHtml(el.type)}">${children || resolveText(el)}</div>`;
    }
  }
}

function renderHead(title: string, desc?: string) {
  return `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${desc ? `<meta name="description" content="${escapeHtml(desc)}" />` : ""}
    <link rel="stylesheet" href="./styles.css" />
  `;
}

function defaultCss() {
  return `
    body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
    .container { max-width: 1160px; margin: auto; padding: 1.25rem; }
    .btn { background: #6c5ce7; color: #fff; padding: .6rem 1rem; border-radius: 8px; }
    img { max-width: 100%; height: auto; }
    .row { display: flex; flex-wrap: wrap; gap: 1rem; }
    .col { flex: 1 1 280px; }
  `.trim();
}

/* ============================================================================
 * Export formats
 * ========================================================================== */
export function exportPageToHTML(page: UINovaPage, project?: UINovaProject): string {
  const bodyContent = (page.elements || []).map(renderElement).join("\n");
  const title = page.meta?.title || page.name || project?.name || "UINova";
  const desc = page.meta?.description || project?.tagline || "";

  return [
    "<!doctype html>",
    `<html lang="fr">`,
    "<head>",
    renderHead(title, desc),
    page.css ? `<style>${page.css}</style>` : "",
    "</head>",
    "<body>",
    `<header class="container"><h1>${escapeHtml(project?.name || "UINova")}</h1></header>`,
    `<main class="container">`,
    bodyContent,
    "</main>",
    `<footer class="container"><small>Exporté avec UInova</small></footer>`,
    "</body>",
    "</html>",
  ].join("\n");
}

export function exportProjectToJSON(project: UINovaProject): string {
  return JSON.stringify(project, null, 2);
}

export function exportProjectToFlutter(project: UINovaProject): string {
  return `
import 'package:flutter/material.dart';

void main() => runApp(const UInovaApp());

class UInovaApp extends StatelessWidget {
  const UInovaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${escapeHtml(project.name)}',
      home: Scaffold(
        appBar: AppBar(title: const Text('${escapeHtml(project.name)}')),
        body: ListView(
          children: [
            ${project.pages
              ?.map((p) => `ListTile(title: Text("${escapeHtml(p.name)}"))`)
              .join(",\n") || ""}
          ],
        ),
      ),
    );
  }
}
  `.trim();
}

/* ============================================================================
 * Export Projet → ZIP
 * ========================================================================== */
export async function exportProject(
  project: UINovaProject,
  options: ExportOptions = { format: "html" }
): Promise<Buffer> {
  const {
    format,
    minify = false,
    includeReadme = true,
    includeRobots = true,
    includeSitemap = true,
    pretty = true,
    outputDirName,
    assetsDir = "assets",
    saveToDisk,
    onAudit,
  } = options;

  if (!project.pages?.length) throw new Error("Project has no pages");

  const zip = new JSZip();
  const root = zip.folder(outputDirName || slugify(project.name) || "uinova")!;
  const assets = root.folder(assetsDir)!;

  // CSS
  root.file("styles.css", [defaultCss(), project.css || ""].join("\n\n"));

  // Pages
  const indexLinks: { href: string; title: string }[] = [];
  for (const page of project.pages) {
    const base = slugify(page.path || page.name);
    const filename = `${base}.html`;

    let html = exportPageToHTML(page, project);
    if (minify) {
      try {
        const { minify: htmlMinify } = require("html-minifier-terser");
        html = await htmlMinify(html, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
        });
      } catch {
        if (pretty) html = html.replace(/\n{3,}/g, "\n\n");
      }
    }
    root.file(filename, html);
    indexLinks.push({ href: `./${filename}`, title: page.name });
  }

  // Index.html
  const indexHtml = [
    "<!doctype html>",
    `<html lang="fr">`,
    "<head>",
    renderHead(project.name, project.tagline),
    "</head>",
    "<body>",
    `<header class="container"><h1>${escapeHtml(project.name)}</h1></header>`,
    `<nav class="container">`,
    indexLinks.map((l) => `<a href="${l.href}">${escapeHtml(l.title)}</a>`).join(" "),
    "</nav>",
    "</body></html>",
  ].join("\n");
  root.file("index.html", indexHtml);

  // README
  if (includeReadme) {
    root.file("README.md", `# ${project.name}\n\nExport généré avec UInova.`);
  }

  // robots.txt & sitemap.xml
  if (includeRobots) root.file("robots.txt", "User-agent: *\nAllow: /");
  if (includeSitemap) {
    const urls = indexLinks.map((l) => `<url><loc>${l.href}</loc></url>`).join("\n");
    root.file("sitemap.xml", `<?xml version="1.0"?><urlset>${urls}</urlset>`);
  }

  // JSON / Flutter en plus
  if (format === "json") root.file("project.json", exportProjectToJSON(project));
  if (format === "flutter") root.file("main.dart", exportProjectToFlutter(project));

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  if (saveToDisk) {
    fs.writeFileSync(path.join(saveToDisk, `${slugify(project.name)}.zip`), buffer);
  }

  if (onAudit) await onAudit("EXPORT_PROJECT", { projectId: project.id, format });

  return buffer;
}
