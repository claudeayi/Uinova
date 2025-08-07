import { ElementData } from "../store/useAppStore";

const cssFromProps = (p: Record<string, any>) => {
  const css: string[] = [];
  if (p.bg) css.push(`background:${p.bg};`);
  if (p.color) css.push(`color:${p.color};`);
  if (p.p !== undefined) css.push(`padding:${p.p}px;`);
  if (p.fontSize) css.push(`font-size:${p.fontSize}px;`);
  if (p.display) css.push(`display:${p.display};`);
  return css.join("");
};

const nodeToHTML = (el: ElementData): string => {
  const p = el.props || {};
  if (el.type === "button") return `<button style="${cssFromProps(p)}">${p.label || "Button"}</button>`;
  if (el.type === "input") return `<input style="${cssFromProps(p)}" placeholder="${p.label || ""}" />`;
  if (el.type === "card") return `<div style="${cssFromProps(p)}">${p.label || "Card"}</div>`;
  if (el.type === "group") return `<div style="${cssFromProps(p)}">${(el.children || []).map(nodeToHTML).join("")}</div>`;
  return "";
};

export function toHTML(elements: ElementData[]): string {
  const body = elements.map(nodeToHTML).join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>UInova Export</title>
<style>html,body{margin:0;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}</style>
</head>
<body>${body}</body>
</html>`;
}

export function download(filename: string, content: string, type = "text/html") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
