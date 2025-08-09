// src/utils/exporters.ts
import { ElementData } from "../store/useAppStore";

/* =========================
 * Types & helpers
 * ========================= */
type Binding = { collectionId: string; field: string };
type Resolver = (b: Binding) => any;

const STYLE_KEYS = new Set(["bg", "color", "p", "fontSize", "display"]);

function escapeHtml(v: any): string {
  const s = v == null ? "" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pickStyleProps(p: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(p || {})) {
    if (STYLE_KEYS.has(k)) out[k] = p[k];
  }
  return out;
}

/* =========================
 * Style serializers
 * ========================= */
function styleToCss(p: Record<string, any>): string {
  let css = "";
  if ("bg" in p) css += `background:${p.bg};`;
  if ("color" in p) css += `color:${p.color};`;
  if ("p" in p) css += `padding:${Number(p.p)}px;`;
  if ("fontSize" in p) css += `font-size:${Number(p.fontSize)}px;`;
  if ("display" in p) css += `display:${p.display};`;
  return css;
}

function styleToJsx(p: Record<string, any>): string {
  const parts: string[] = [];
  if ("bg" in p) parts.push(`background: ${JSON.stringify(p.bg)}`);
  if ("color" in p) parts.push(`color: ${JSON.stringify(p.color)}`);
  if ("p" in p) parts.push(`padding: ${Number(p.p)}`);
  if ("fontSize" in p) parts.push(`fontSize: ${Number(p.fontSize)}`);
  if ("display" in p) parts.push(`display: ${JSON.stringify(p.display)}`);
  return parts.join(", ");
}

/* =========================
 * Binding resolver
 * ========================= */
function resolveBound(props: any, resolver?: Resolver) {
  const b = props?._binding;
  if (!resolver || !b?.collectionId || !b?.field) return null;
  return resolver({ collectionId: b.collectionId, field: b.field });
}

/* =========================
 * HTML
 * ========================= */
function nodeToHTML(el: ElementData, resolver?: Resolver): string {
  const p = el.props || {};
  const bound = resolveBound(p, resolver);
  const style = styleToCss(pickStyleProps(p));

  if (el.type === "button")
    return `<button style="${style}">${escapeHtml(bound ?? p.label ?? "Button")}</button>`;
  if (el.type === "input")
    return `<input style="${style}" placeholder="${escapeHtml(bound ?? p.label ?? "")}" />`;
  if (el.type === "card")
    return `<div style="${style}">${escapeHtml(bound ?? p.label ?? "Card")}</div>`;
  if (el.type === "group")
    return `<div style="${style}">${(el.children || []).map((c) => nodeToHTML(c, resolver)).join("")}</div>`;

  return `<div style="${style}">${escapeHtml(bound ?? p.label ?? el.type)}</div>`;
}

function htmlDoc(body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UInova Export</title>
  <style>
    html,body{margin:0;padding:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
    .group{border:2px dashed #E5E7EB; border-radius:8px; padding:8px; margin:8px 0}
    .card{background:#F3F4F6; border-radius:8px; padding:12px; margin:8px 0}
    button{background:#2563eb;color:#fff;border:none;border-radius:6px;padding:8px 12px}
    input{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function generateHTML(elements: ElementData[]): string {
  const body = elements.map((e) => nodeToHTML(e)).join("");
  return htmlDoc(body);
}

export function generateHTMLWithResolver(elements: ElementData[], resolver: Resolver): string {
  const body = elements.map((e) => nodeToHTML(e, resolver)).join("");
  return htmlDoc(body);
}

/* =========================
 * Flutter (Dart)
 * ========================= */
function nodeToFlutter(el: ElementData, resolver?: Resolver, depth = 2): string {
  const p = el.props || {};
  const bound = resolveBound(p, resolver);
  const indent = "  ".repeat(depth);

  const text = String(bound ?? p.label ?? (el.type === "input" ? "" : el.type));
  const pad = Number("p" in p ? p.p : 8);

  if (el.type === "button") {
    return `${indent}ElevatedButton(\n${indent}  onPressed: () {},\n${indent}  child: Text('${escapeHtml(text)}'),\n${indent}),`;
  }
  if (el.type === "input") {
    return `${indent}TextField(\n${indent}  decoration: InputDecoration(hintText: '${escapeHtml(text)}'),\n${indent}),`;
  }
  if (el.type === "card") {
    return `${indent}Container(\n${indent}  padding: EdgeInsets.all(${pad}),\n${indent}  child: Text('${escapeHtml(text)}'),\n${indent}),`;
  }
  if (el.type === "group") {
    return `${indent}Column(\n${indent}  children: [\n${(el.children || [])
      .map((c) => nodeToFlutter(c, resolver, depth + 2))
      .join("\n")}\n${indent}  ],\n${indent}),`;
  }
  return `${indent}Text('${escapeHtml(text)}'),`;
}

export function generateFlutter(elements: ElementData[]): string {
  return `Column(\n  children: [\n${elements.map((e) => nodeToFlutter(e, undefined, 2)).join("\n")}\n  ],\n);`;
}

export function generateFlutterWithResolver(elements: ElementData[], resolver: Resolver): string {
  return `Column(\n  children: [\n${elements.map((e) => nodeToFlutter(e, resolver, 2)).join("\n")}\n  ],\n);`;
}

/* =========================
 * React (JSX)
 * ========================= */
function nodeToReact(el: ElementData, resolver?: Resolver, depth = 2): string {
  const p = el.props || {};
  const bound = resolveBound(p, resolver);
  const indent = "  ".repeat(depth);
  const style = styleToJsx(pickStyleProps(p));
  const open = style ? ` style={{ ${style} }}` : "";

  if (el.type === "button")
    return `${indent}<button${open}>${escapeHtml(bound ?? p.label ?? "Button")}</button>`;
  if (el.type === "input")
    return `${indent}<input${open} placeholder="${escapeHtml(bound ?? p.label ?? "")}" />`;
  if (el.type === "card")
    return `${indent}<div${open}>${escapeHtml(bound ?? p.label ?? "Card")}</div>`;
  if (el.type === "group")
    return `${indent}<div${open}>\n${(el.children || [])
      .map((c) => nodeToReact(c, resolver, depth + 2))
      .join("\n")}\n${indent}</div>`;

  return `${indent}<div${open}>${escapeHtml(bound ?? p.label ?? el.type)}</div>`;
}

export function generateReact(elements: ElementData[]): string {
  return `export default function ExportedComponent() {\n  return (\n${elements
    .map((e) => nodeToReact(e, undefined, 3))
    .join("\n")}\n  );\n}`;
}

export function generateReactWithResolver(elements: ElementData[], resolver: Resolver): string {
  return `export default function ExportedComponent() {\n  return (\n${elements
    .map((e) => nodeToReact(e, resolver, 3))
    .join("\n")}\n  );\n}`;
}

/* =========================
 * Vue
 * ========================= */
function nodeToVue(el: ElementData, resolver?: Resolver, depth = 2): string {
  const p = el.props || {};
  const bound = resolveBound(p, resolver);
  const indent = "  ".repeat(depth);
  const style = styleToCss(pickStyleProps(p));

  if (el.type === "button")
    return `${indent}<button style="${style}">${escapeHtml(bound ?? p.label ?? "Button")}</button>`;
  if (el.type === "input")
    return `${indent}<input style="${style}" placeholder="${escapeHtml(bound ?? p.label ?? "")}" />`;
  if (el.type === "card")
    return `${indent}<div style="${style}">${escapeHtml(bound ?? p.label ?? "Card")}</div>`;
  if (el.type === "group")
    return `${indent}<div style="${style}">\n${(el.children || [])
      .map((c) => nodeToVue(c, resolver, depth + 2))
      .join("\n")}\n${indent}</div>`;

  return `${indent}<div style="${style}">${escapeHtml(bound ?? p.label ?? el.type)}</div>`;
}

export function generateVue(elements: ElementData[]): string {
  return `<template>\n  <div>\n${elements.map((e) => nodeToVue(e)).join("\n")}\n  </div>\n</template>\n\n<script setup>\n// Ajoute ta logique ici\n</script>\n`;
}

export function generateVueWithResolver(elements: ElementData[], resolver: Resolver): string {
  return `<template>\n  <div>\n${elements.map((e) => nodeToVue(e, resolver)).join("\n")}\n  </div>\n</template>\n\n<script setup>\n// Ajoute ta logique ici\n</script>\n`;
}

/* =========================
 * JSON
 * ========================= */
export function generateJSON(elements: ElementData[]): string {
  return JSON.stringify(elements, null, 2);
}

export function importJSON(jsonString: string): ElementData[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) throw new Error("Données invalides");
    return parsed;
  } catch (e: any) {
    alert("Erreur d'import JSON : " + (e?.message || String(e)));
    return [];
  }
}

/* =========================
 * ZIP (page courante)
 * ========================= */
export async function generateZip(elements: ElementData[], resolver?: Resolver): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const html = resolver ? generateHTMLWithResolver(elements, resolver) : generateHTML(elements);
  const react = resolver ? generateReactWithResolver(elements, resolver) : generateReact(elements);
  const vue = resolver ? generateVueWithResolver(elements, resolver) : generateVue(elements);
  const dart = resolver ? generateFlutterWithResolver(elements, resolver) : generateFlutter(elements);

  zip.file("export.html", html);
  zip.file("ExportedComponent.jsx", react);
  zip.file("ExportedComponent.vue", vue);
  zip.file("export.dart", dart);
  zip.file("export.json", generateJSON(elements));

  return zip.generateAsync({ type: "blob" });
}

/* =========================
 * ZIP MULTI-PAGES (projet complet)
 * ========================= */
type SimplePage = { id: string; name: string; elements: any[] };
type SimpleProject = { id: string; name: string; pages: SimplePage[] };

function buildProjectIndexHTML(project: SimpleProject): string {
  const links = project.pages
    .map((p) => `<li><a href="pages/${p.id}.html">${escapeHtml(p.name || p.id)}</a></li>`)
    .join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(project.name || "UInova Site")}</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px}
    ul{line-height:1.9}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <h1>${escapeHtml(project.name || "Site UInova")}</h1>
  <p>Pages exportées :</p>
  <ul>${links}</ul>
</body>
</html>`;
}

/**
 * Exporte un projet complet :
 *  - index.html
 *  - pages/{pageId}.html (avec resolver CMS si fourni)
 *  - project.json (dump)
 */
export async function generateProjectZip(
  project: SimpleProject,
  resolver?: Resolver
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file("index.html", buildProjectIndexHTML(project));
  zip.file("project.json", JSON.stringify(project, null, 2));

  const folder = zip.folder("pages");
  if (!folder) throw new Error("Impossible de créer le dossier pages dans le ZIP.");

  for (const page of project.pages) {
    const html = resolver
      ? generateHTMLWithResolver(page.elements as any[], resolver)
      : generateHTML(page.elements as any[]);
    folder.file(`${page.id}.html`, html);
  }

  return zip.generateAsync({ type: "blob" });
}

/* =========================
 * Download helper
 * ========================= */
export function download(filename: string, content: string | Blob, type = "text/html;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}
