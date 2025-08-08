import { ElementData } from "../store/useAppStore";

// ===== STYLE UTILS
function styleToCss(p: Record<string, any>): string {
  let css = "";
  if (p.bg) css += `background:${p.bg};`;
  if (p.color) css += `color:${p.color};`;
  if (p.p !== undefined) css += `padding:${p.p}px;`;
  if (p.fontSize) css += `font-size:${p.fontSize}px;`;
  if (p.display) css += `display:${p.display};`;
  return css;
}

// ===== EXPORT HTML
function nodeToHTML(el: ElementData): string {
  const p = el.props || {};
  if (el.type === "button")
    return `<button style="${styleToCss(p)}">${p.label || "Button"}</button>`;
  if (el.type === "input")
    return `<input style="${styleToCss(p)}" placeholder="${p.label || ""}" />`;
  if (el.type === "card")
    return `<div style="${styleToCss(p)}">${p.label || "Card"}</div>`;
  if (el.type === "group")
    return `<div style="${styleToCss(p)}">${(el.children || []).map(nodeToHTML).join("")}</div>`;
  return "";
}

export function generateHTML(elements: ElementData[]): string {
  const body = elements.map(nodeToHTML).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UInova Export</title>
  <style>
    html,body{margin:0;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
    button,input{font-family:inherit;}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// ===== EXPORT FLUTTER
function nodeToFlutter(el: ElementData, depth = 2): string {
  const p = el.props || {};
  let indent = "  ".repeat(depth);

  if (el.type === "button") {
    return `${indent}ElevatedButton(\n${indent}  onPressed: () {},\n${indent}  child: Text('${p.label || "Button"}'),\n${indent}),`;
  }
  if (el.type === "input") {
    return `${indent}TextField(\n${indent}  decoration: InputDecoration(hintText: '${p.label || ""}'),\n${indent}),`;
  }
  if (el.type === "card") {
    return `${indent}Container(\n${indent}  padding: EdgeInsets.all(${p.p ?? 8}),\n${indent}  child: Text('${p.label || "Card"}'),\n${indent}),`;
  }
  if (el.type === "group") {
    return `${indent}Column(\n${indent}  children: [\n${(el.children || []).map(c => nodeToFlutter(c, depth + 2)).join("\n")}\n${indent}  ],\n${indent}),`;
  }
  return "";
}
export function generateFlutter(elements: ElementData[]): string {
  return `Column(\n  children: [\n${elements.map(e => nodeToFlutter(e, 2)).join("\n")}\n  ],\n);`;
}

// ===== EXPORT REACT (JSX)
function nodeToReact(el: ElementData, depth = 2): string {
  const p = el.props || {};
  let indent = "  ".repeat(depth);
  if (el.type === "button")
    return `${indent}<button style={{ ${Object.entries(p).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(", ")} }}>${p.label || "Button"}</button>`;
  if (el.type === "input")
    return `${indent}<input style={{ ${Object.entries(p).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(", ")} }} placeholder="${p.label || ""}" />`;
  if (el.type === "card")
    return `${indent}<div style={{ ${Object.entries(p).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(", ")} }}>${p.label || "Card"}</div>`;
  if (el.type === "group")
    return `${indent}<div style={{ ${Object.entries(p).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(", ")} }}>\n${(el.children || []).map(c => nodeToReact(c, depth + 2)).join("\n")}\n${indent}</div>`;
  return "";
}
export function generateReact(elements: ElementData[]): string {
  return `export default function ExportedComponent() {\n  return (\n${elements.map(e => nodeToReact(e, 3)).join("\n")}\n  );\n}`;
}

// ===== EXPORT VUE
function nodeToVue(el: ElementData, depth = 2): string {
  const p = el.props || {};
  let indent = "  ".repeat(depth);
  if (el.type === "button")
    return `${indent}<button style="${styleToCss(p)}">${p.label || "Button"}</button>`;
  if (el.type === "input")
    return `${indent}<input style="${styleToCss(p)}" placeholder="${p.label || ""}" />`;
  if (el.type === "card")
    return `${indent}<div style="${styleToCss(p)}">${p.label || "Card"}</div>`;
  if (el.type === "group")
    return `${indent}<div style="${styleToCss(p)}">\n${(el.children || []).map(c => nodeToVue(c, depth + 2)).join("\n")}\n${indent}</div>`;
  return "";
}
export function generateVue(elements: ElementData[]): string {
  return `<template>\n  <div>\n${elements.map(e => nodeToVue(e, 3)).join("\n")}\n  </div>\n</template>\n\n<script setup>\n// Ajoute ta logique ici\n</script>\n`;
}

// ===== EXPORT JSON
export function generateJSON(elements: ElementData[]): string {
  return JSON.stringify(elements, null, 2);
}

// ===== IMPORT JSON
export function importJSON(jsonString: string): ElementData[] {
  try {
    const parsed = JSON.parse(jsonString);
    // Petite vérif basique : c'est un tableau avec type/props/id
    if (!Array.isArray(parsed)) throw new Error("Données invalides");
    return parsed;
  } catch (e) {
    alert("Erreur d'import JSON : " + e);
    return [];
  }
}

// ===== ZIP (utilise jszip)
export async function generateZip(elements: ElementData[]): Promise<Blob> {
  // Import dynamique pour garder le bundle léger (npm i jszip)
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file("export.html", generateHTML(elements));
  zip.file("export.dart", generateFlutter(elements));
  zip.file("ExportedComponent.jsx", generateReact(elements));
  zip.file("ExportedComponent.vue", generateVue(elements));
  zip.file("export.json", generateJSON(elements));

  return zip.generateAsync({ type: "blob" });
}

// ===== DOWNLOAD UTIL
export function download(filename: string, content: string | Blob, type = "text/html") {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { type });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}
