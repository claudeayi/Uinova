// src/utils/exporters.ts
import type { ElementData } from "../store/useAppStore";

/* -----------------------------------------------------------
 * Helpers communs
 * ----------------------------------------------------------- */

type Resolver = (ref: { collectionId: string; field: string }) => any;

function resolveBinding(p: any, resolver?: Resolver): any {
  const b = p?._binding;
  if (resolver && b?.collectionId && b?.field) {
    try {
      const v = resolver({ collectionId: b.collectionId, field: b.field });
      return v ?? p.label ?? "";
    } catch {
      return p.label ?? "";
    }
  }
  return p.label ?? "";
}

function styleToCss(p: Record<string, any> = {}): string {
  let css = "";
  if (p.bg) css += `background:${p.bg};`;
  if (p.color) css += `color:${p.color};`;
  if (p.p != null) css += `padding:${Number(p.p)}px;`;
  if (p.fontSize != null) css += `font-size:${Number(p.fontSize)}px;`;
  if (p.display) css += `display:${p.display};`;
  return css;
}

function propsToInlineJsx(p: Record<string, any> = {}): string {
  // convertit props style en objet JSX inline
  const style: Record<string, any> = {};
  if (p.bg) style.background = p.bg;
  if (p.color) style.color = p.color;
  if (p.p != null) style.padding = Number(p.p);
  if (p.fontSize != null) style.fontSize = Number(p.fontSize);
  if (p.display) style.display = p.display;
  const pairs = Object.entries(style).map(([k, v]) => `${k}:${JSON.stringify(v)}`);
  return pairs.join(", ");
}

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -----------------------------------------------------------
 * HTML EXPORT (avec resolver CMS)
 * ----------------------------------------------------------- */

function nodeToHTML(el: ElementData, resolver?: Resolver): string {
  const p = el.props || {};
  const labelOrBound = resolveBinding(p, resolver);
  const css = styleToCss(p);

  switch (el.type) {
    /* Base */
    case "button":
      return `<button style="${css}">${escapeHtml(labelOrBound || "Button")}</button>`;
    case "input":
      return `<input style="${css}" placeholder="${escapeHtml(labelOrBound || "")}" />`;
    case "card":
      return `<div style="${css}">${escapeHtml(labelOrBound || "Card")}</div>`;
    case "group":
      return `<div style="${css}">${(el.children || []).map((c) => nodeToHTML(c, resolver)).join("")}</div>`;

    /* Layouts */
    case "grid": {
      const cols = Number(p.cols ?? 2);
      const gap = Number(p.gap ?? 12);
      const gridCss = `${css}display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`;
      return `<div style="${gridCss}">${(el.children || []).map((c) => nodeToHTML(c, resolver)).join("")}</div>`;
    }
    case "stack": {
      const dir = p.direction === "row" ? "row" : "column";
      const gap = Number(p.gap ?? 8);
      const st = `${css}display:flex;flex-direction:${dir};gap:${gap}px;`;
      return `<div style="${st}">${(el.children || []).map((c) => nodeToHTML(c, resolver)).join("")}</div>`;
    }

    /* Media */
    case "image":
      return `<img style="${css}" src="${escapeHtml(p.src || "https://via.placeholder.com/640x360?text=Image")}" alt="${escapeHtml(p.alt || "image")}" />`;
    case "video":
      return `<video style="${css}" src="${escapeHtml(p.src || "")}" controls poster="${escapeHtml(p.poster || "https://via.placeholder.com/640x360?text=Video")}"></video>`;

    /* Nav / Footer */
    case "navbar": {
      const items: string[] = p.items || ["Home", "About", "Contact"];
      const brand = p.brand || "UInova";
      return `<nav style="${css}"><div>${escapeHtml(brand)}</div><ul>${items.map((it) => `<li>${escapeHtml(it)}</li>`).join("")}</ul></nav>`;
    }
    case "footer":
      return `<footer style="${css}">${escapeHtml(p.text || `© ${new Date().getFullYear()} UInova`)}</footer>`;

    /* Tabs / Accordion */
    case "tabs": {
      const tabs: { label: string; content?: string }[] = p.tabs || [
        { label: "Tab 1", content: "Content 1" },
        { label: "Tab 2", content: "Content 2" },
      ];
      const active = Number(p.active ?? 0);
      return `<div style="${css}"><div>${tabs.map((t, i) => `<button>${escapeHtml(t.label)}</button>`).join("")}</div><div>${escapeHtml(
        tabs[active]?.content || ""
      )}</div></div>`;
    }
    case "accordion": {
      const items: { title: string; content: string }[] = p.items || [
        { title: "Item 1", content: "Content 1" },
        { title: "Item 2", content: "Content 2" },
      ];
      return `<div style="${css}">${items
        .map((it) => `<section><div>${escapeHtml(it.title)}</div><div>${escapeHtml(it.content)}</div></section>`)
        .join("")}</div>`;
    }

    /* Forms */
    case "form":
      return `<form style="${css}" onsubmit="return false;">${(el.children || []).map((c) => nodeToHTML(c, resolver)).join("")}<button>${
        escapeHtml(p.submitLabel || "Envoyer")
      }</button></form>`;
    case "textarea":
      return `<textarea style="${css}" placeholder="${escapeHtml(labelOrBound || "Textarea")}"></textarea>`;
    case "select": {
      const options: string[] = p.options || ["Option 1", "Option 2"];
      const ph = labelOrBound || "Select";
      return `<select style="${css}"><option selected disabled hidden>${escapeHtml(ph)}</option>${options
        .map((o) => `<option>${escapeHtml(o)}</option>`)
        .join("")}</select>`;
    }
    case "radio": {
      const options: string[] = p.options || ["A", "B", "C"];
      return `<div style="${css}">${options
        .map((o) => `<label><input type="radio" name="${escapeHtml(el.id)}" /> ${escapeHtml(o)}</label>`)
        .join("")}</div>`;
    }
    case "checkbox":
      return `<label style="${css}"><input type="checkbox" /> ${escapeHtml(labelOrBound || "Checkbox")}</label>`;

    /* Sections */
    case "hero":
      return `<section style="${css}"><h1>${escapeHtml(p.title || "Construisez plus vite avec UInova")}</h1><p>${escapeHtml(
        p.subtitle || "Éditeur visuel, export multi-formats, collaboration live."
      )}</p><button>${escapeHtml(p.cta || "Commencer")}</button></section>`;
    case "pricing": {
      const plans =
        p.plans ||
        [
          { name: "Free", price: "0€", features: ["1 projet", "Export HTML"] },
          { name: "Pro", price: "19€/mo", features: ["Projets illimités", "Export ZIP Site"] },
        ];
      return `<section style="${css}">${plans
        .map(
          (pl: any) =>
            `<article><div>${escapeHtml(pl.name)}</div><div>${escapeHtml(pl.price)}</div><ul>${(pl.features || [])
              .map((f: string) => `<li>• ${escapeHtml(f)}</li>`)
              .join("")}</ul></article>`
        )
        .join("")}</section>`;
    }
    case "features": {
      const feats: { title: string; subtitle?: string }[] =
        p.items || [
          { title: "Rapide", subtitle: "Build en minutes" },
          { title: "Collaboratif", subtitle: "Édition live" },
          { title: "Exportable", subtitle: "HTML/React/Vue/Flutter" },
        ];
      return `<section style="${css}">${feats
        .map((f) => `<article><div>${escapeHtml(f.title)}</div><div>${escapeHtml(f.subtitle || "")}</div></article>`)
        .join("")}</section>`;
    }

    default:
      return `<div style="${css}">${escapeHtml(labelOrBound || el.type)}</div>`;
  }
}

export function generateHTMLWithResolver(elements: ElementData[], resolver?: Resolver): string {
  const body = elements.map((e) => nodeToHTML(e, resolver)).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>UInova Export</title>
  <style>html,body{margin:0;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}button,input,select,textarea{font-family:inherit}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/* -----------------------------------------------------------
 * REACT (JSX) EXPORT (avec resolver)
 * ----------------------------------------------------------- */

function nodeToReact(el: ElementData, resolver?: Resolver, depth = 2): string {
  const p = el.props || {};
  const indent = "  ".repeat(depth);
  const styled = propsToInlineJsx(p);
  const labelOrBound = resolveBinding(p, resolver);

  const wrap = (s: string) => `${indent}${s}`;

  switch (el.type) {
    case "button":
      return wrap(`<button style={{ ${styled} }}>${escapeHtml(labelOrBound || "Button")}</button>`);
    case "input":
      return wrap(`<input style={{ ${styled} }} placeholder="${escapeHtml(labelOrBound || "")}" />`);
    case "card":
      return wrap(`<div style={{ ${styled} }}>${escapeHtml(labelOrBound || "Card")}</div>`);
    case "group":
      return `${wrap(`<div style={{ ${styled} }}>`)}
${(el.children || []).map((c) => nodeToReact(c, resolver, depth + 1)).join("\n")}
${wrap(`</div>`)}`;

    case "grid": {
      const cols = Number(p.cols ?? 2);
      const gap = Number(p.gap ?? 12);
      return `${wrap(`<div style={{ ${styled}, display:"grid", gridTemplateColumns:"repeat(${cols}, minmax(0,1fr))", gap:${gap} }}>`)}
${(el.children || []).map((c) => nodeToReact(c, resolver, depth + 1)).join("\n")}
${wrap(`</div>`)}`;
    }
    case "stack": {
      const dir = p.direction === "row" ? "row" : "column";
      const gap = Number(p.gap ?? 8);
      return `${wrap(`<div style={{ ${styled}, display:"flex", flexDirection:"${dir}", gap:${gap} }}>`)}
${(el.children || []).map((c) => nodeToReact(c, resolver, depth + 1)).join("\n")}
${wrap(`</div>`)}`;
    }

    case "image":
      return wrap(`<img style={{ ${styled} }} src="${escapeHtml(p.src || "https://via.placeholder.com/640x360?text=Image")}" alt="${escapeHtml(p.alt || "image")}" />`);
    case "video":
      return wrap(
        `<video style={{ ${styled} }} src="${escapeHtml(p.src || "")}" controls poster="${escapeHtml(p.poster || "https://via.placeholder.com/640x360?text=Video")}" />`
      );

    case "navbar": {
      const items: string[] = p.items || ["Home", "About", "Contact"];
      const brand = p.brand || "UInova";
      return `${wrap(`<nav style={{ ${styled} }}>`)}
${wrap(`<div>${escapeHtml(brand)}</div>`)}
${wrap(`<ul>`)}
${items.map((it) => `${indent}  <li>${escapeHtml(it)}</li>`).join("\n")}
${wrap(`</ul>`)}
${wrap(`</nav>`)}`;
    }
    case "footer":
      return wrap(`<footer style={{ ${styled} }}>${escapeHtml(p.text || `© ${new Date().getFullYear()} UInova`)}</footer>`);

    case "tabs": {
      const tabs: { label: string; content?: string }[] = p.tabs || [
        { label: "Tab 1", content: "Content 1" },
        { label: "Tab 2", content: "Content 2" },
      ];
      const active = Number(p.active ?? 0);
      return `${wrap(`<div style={{ ${styled} }}>`)}
${wrap(`<div>`)}
${tabs.map((t) => `${indent}  <button>${escapeHtml(t.label)}</button>`).join("\n")}
${wrap(`</div>`)}
${wrap(`<div>${escapeHtml(tabs[active]?.content || "")}</div>`)}
${wrap(`</div>`)}`;
    }
    case "accordion": {
      const items: { title: string; content: string }[] = p.items || [
        { title: "Item 1", content: "Content 1" },
        { title: "Item 2", content: "Content 2" },
      ];
      return `${wrap(`<div style={{ ${styled} }}>`)}
${items
  .map(
    (it) => `${indent}  <section>
${indent}    <div>${escapeHtml(it.title)}</div>
${indent}    <div>${escapeHtml(it.content)}</div>
${indent}  </section>`
  )
  .join("\n")}
${wrap(`</div>`)}`;
    }

    case "form":
      return `${wrap(`<form style={{ ${styled} }} onSubmit={(e)=>e.preventDefault()}>`)}
${(el.children || []).map((c) => nodeToReact(c, resolver, depth + 1)).join("\n")}
${wrap(`<button>${escapeHtml(p.submitLabel || "Envoyer")}</button>`)}
${wrap(`</form>`)}`;
    case "textarea":
      return wrap(`<textarea style={{ ${styled} }} placeholder="${escapeHtml(labelOrBound || "Textarea")}" />`);
    case "select": {
      const options: string[] = p.options || ["Option 1", "Option 2"];
      const ph = labelOrBound || "Select";
      return `${wrap(`<select style={{ ${styled} }} defaultValue="">`)}
${wrap(`  <option value="" disabled hidden>${escapeHtml(ph)}</option>`)}
${options.map((o) => `${indent}  <option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("\n")}
${wrap(`</select>`)}`;
    }
    case "radio": {
      const options: string[] = p.options || ["A", "B", "C"];
      return `${wrap(`<div style={{ ${styled} }}>`)}
${options.map((o) => `${indent}  <label><input type="radio" name="${escapeHtml(el.id)}" /> ${escapeHtml(o)}</label>`).join("\n")}
${wrap(`</div>`)}`;
    }
    case "checkbox":
      return wrap(`<label style={{ ${styled} }}><input type="checkbox" /> ${escapeHtml(labelOrBound || "Checkbox")}</label>`);

    case "hero":
      return `${wrap(`<section style={{ ${styled} }}>`)}
${wrap(`  <h1>${escapeHtml(p.title || "Construisez plus vite avec UInova")}</h1>`)}
${wrap(`  <p>${escapeHtml(p.subtitle || "Éditeur visuel, export multi-formats, collaboration live.")}</p>`)}
${wrap(`  <button>${escapeHtml(p.cta || "Commencer")}</button>`)}
${wrap(`</section>`)}`;
    case "pricing": {
      const plans =
        p.plans ||
        [
          { name: "Free", price: "0€", features: ["1 projet", "Export HTML"] },
          { name: "Pro", price: "19€/mo", features: ["Projets illimités", "Export ZIP Site"] },
        ];
      return `${wrap(`<section style={{ ${styled} }}>`)}
${plans
  .map(
    (pl: any) => `${indent}  <article>
${indent}    <div>${escapeHtml(pl.name)}</div>
${indent}    <div>${escapeHtml(pl.price)}</div>
${indent}    <ul>
${(pl.features || []).map((f: string) => `${indent}      <li>• ${escapeHtml(f)}</li>`).join("\n")}
${indent}    </ul>
${indent}  </article>`
  )
  .join("\n")}
${wrap(`</section>`)}`;
    }
    case "features": {
      const feats: { title: string; subtitle?: string }[] =
        p.items || [
          { title: "Rapide", subtitle: "Build en minutes" },
          { title: "Collaboratif", subtitle: "Édition live" },
          { title: "Exportable", subtitle: "HTML/React/Vue/Flutter" },
        ];
      return `${wrap(`<section style={{ ${styled} }}>`)}
${feats
  .map(
    (f) => `${indent}  <article>
${indent}    <div>${escapeHtml(f.title)}</div>
${indent}    <div>${escapeHtml(f.subtitle || "")}</div>
${indent}  </article>`
  )
  .join("\n")}
${wrap(`</section>`)}`;
    }

    default:
      return wrap(`<div style={{ ${styled} }}>${escapeHtml(labelOrBound || el.type)}</div>`);
  }
}

export function generateReactWithResolver(elements: ElementData[], resolver?: Resolver): string {
  return `export default function ExportedComponent(){\n  return (\n${elements
    .map((e) => nodeToReact(e, resolver, 3))
    .join("\n")}\n  );\n}`;
}

/* -----------------------------------------------------------
 * VUE EXPORT (SFC) (avec resolver)
 * ----------------------------------------------------------- */

function nodeToVue(el: ElementData, resolver?: Resolver, depth = 2): string {
  const p = el.props || {};
  const indent = "  ".repeat(depth);
  const labelOrBound = resolveBinding(p, resolver);
  const css = styleToCss(p);

  const wrap = (s: string) => `${indent}${s}`;

  switch (el.type) {
    case "button":
      return wrap(`<button style="${css}">${escapeHtml(labelOrBound || "Button")}</button>`);
    case "input":
      return wrap(`<input style="${css}" placeholder="${escapeHtml(labelOrBound || "")}" />`);
    case "card":
      return wrap(`<div style="${css}">${escapeHtml(labelOrBound || "Card")}</div>`);
    case "group":
      return `${wrap(`<div style="${css}">`)}
${(el.children || []).map((c) => nodeToVue(c, resolver, depth + 1)).join("\n")}
${wrap(`</div>`)}`;

    case "grid": {
      const cols = Number(p.cols ?? 2);
      const gap = Number(p.gap ?? 12);
      const gridCss = `${css}display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`;
      return `${wrap(`<div style="${gridCss}">`)}
${(el.children || []).map((c) => nodeToVue(c, resolver, depth + 1)).join("\n")}
${wrap(`</div>`)}`;
    }
    case "stack": {
      const dir = p.direction === "row" ? "row" : "column";
      const gap = Number(p.gap ?? 8);
      const st = `${css}display:flex;flex-direction:${dir};gap:${gap}px;`;
      return `${wrap(`<div style="${st}">`)}
${(el.children || []).map((c) => nodeToVue(c, resolver, depth + 1)).join("\n")}
${wrap(`</div>`)}`;
    }

    case "image":
      return wrap(`<img style="${css}" src="${escapeHtml(p.src || "https://via.placeholder.com/640x360?text=Image")}" alt="${escapeHtml(p.alt || "image")}" />`);
    case "video":
      return wrap(
        `<video style="${css}" src="${escapeHtml(p.src || "")}" controls poster="${escapeHtml(p.poster || "https://via.placeholder.com/640x360?text=Video")}"></video>`
      );

    case "navbar": {
      const items: string[] = p.items || ["Home", "About", "Contact"];
      const brand = p.brand || "UInova";
      return `${wrap(`<nav style="${css}">`)}
${wrap(`<div>${escapeHtml(brand)}</div>`)}
${wrap(`<ul>`)}
${items.map((it) => `${indent}  <li>${escapeHtml(it)}</li>`).join("\n")}
${wrap(`</ul>`)}
${wrap(`</nav>`)}`;
    }
    case "footer":
      return wrap(`<footer style="${css}">${escapeHtml(p.text || `© ${new Date().getFullYear()} UInova`)}</footer>`);

    case "tabs": {
      const tabs: { label: string; content?: string }[] = p.tabs || [
        { label: "Tab 1", content: "Content 1" },
        { label: "Tab 2", content: "Content 2" },
      ];
      const active = Number(p.active ?? 0);
      return `${wrap(`<div style="${css}">`)}
${wrap(`<div>`)}
${tabs.map((t) => `${indent}  <button>${escapeHtml(t.label)}</button>`).join("\n")}
${wrap(`</div>`)}
${wrap(`<div>${escapeHtml(tabs[active]?.content || "")}</div>`)}
${wrap(`</div>`)}`;
    }
    case "accordion": {
      const items: { title: string; content: string }[] = p.items || [
        { title: "Item 1", content: "Content 1" },
        { title: "Item 2", content: "Content 2" },
      ];
      return `${wrap(`<div style="${css}">`)}
${items
  .map(
    (it) => `${indent}  <section>
${indent}    <div>${escapeHtml(it.title)}</div>
${indent}    <div>${escapeHtml(it.content)}</div>
${indent}  </section>`
  )
  .join("\n")}
${wrap(`</div>`)}`;
    }

    case "form":
      return `${wrap(`<form style="${css}" onsubmit="return false;">`)}
${(el.children || []).map((c) => nodeToVue(c, resolver, depth + 1)).join("\n")}
${wrap(`<button>${escapeHtml(p.submitLabel || "Envoyer")}</button>`)}
${wrap(`</form>`)}`;
    case "textarea":
      return wrap(`<textarea style="${css}" placeholder="${escapeHtml(labelOrBound || "Textarea")}"></textarea>`);
    case "select": {
      const options: string[] = p.options || ["Option 1", "Option 2"];
      const ph = labelOrBound || "Select";
      return `${wrap(`<select style="${css}">`)}
${wrap(`  <option selected disabled hidden>${escapeHtml(ph)}</option>`)}
${options.map((o) => `${indent}  <option>${escapeHtml(o)}</option>`).join("\n")}
${wrap(`</select>`)}`;
    }
    case "radio": {
      const options: string[] = p.options || ["A", "B", "C"];
      return `${wrap(`<div style="${css}">`)}
${options.map((o) => `${indent}  <label><input type="radio" name="${escapeHtml(el.id)}" /> ${escapeHtml(o)}</label>`).join("\n")}
${wrap(`</div>`)}`;
    }
    case "checkbox":
      return wrap(`<label style="${css}"><input type="checkbox" /> ${escapeHtml(labelOrBound || "Checkbox")}</label>`);

    case "hero":
      return `${wrap(`<section style="${css}">`)}
${wrap(`  <h1>${escapeHtml(p.title || "Construisez plus vite avec UInova")}</h1>`)}
${wrap(`  <p>${escapeHtml(p.subtitle || "Éditeur visuel, export multi-formats, collaboration live.")}</p>`)}
${wrap(`  <button>${escapeHtml(p.cta || "Commencer")}</button>`)}
${wrap(`</section>`)}`;
    case "pricing": {
      const plans =
        p.plans ||
        [
          { name: "Free", price: "0€", features: ["1 projet", "Export HTML"] },
          { name: "Pro", price: "19€/mo", features: ["Projets illimités", "Export ZIP Site"] },
        ];
      return `${wrap(`<section style="${css}">`)}
${plans
  .map(
    (pl: any) => `${indent}  <article>
${indent}    <div>${escapeHtml(pl.name)}</div>
${indent}    <div>${escapeHtml(pl.price)}</div>
${indent}    <ul>
${(pl.features || []).map((f: string) => `${indent}      <li>• ${escapeHtml(f)}</li>`).join("\n")}
${indent}    </ul>
${indent}  </article>`
  )
  .join("\n")}
${wrap(`</section>`)}`;
    }
    case "features": {
      const feats: { title: string; subtitle?: string }[] =
        p.items || [
          { title: "Rapide", subtitle: "Build en minutes" },
          { title: "Collaboratif", subtitle: "Édition live" },
          { title: "Exportable", subtitle: "HTML/React/Vue/Flutter" },
        ];
      return `${wrap(`<section style="${css}">`)}
${feats
  .map(
    (f) => `${indent}  <article>
${indent}    <div>${escapeHtml(f.title)}</div>
${indent}    <div>${escapeHtml(f.subtitle || "")}</div>
${indent}  </article>`
  )
  .join("\n")}
${wrap(`</section>`)}`;
    }

    default:
      return wrap(`<div style="${css}">${escapeHtml(labelOrBound || el.type)}</div>`);
  }
}

export function generateVueWithResolver(elements: ElementData[], resolver?: Resolver): string {
  return `<template>
  <div>
${elements.map((e) => nodeToVue(e, resolver, 3)).join("\n")}
  </div>
</template>

<script setup>
// Ajoutez votre logique ici
</script>
`;
}

/* -----------------------------------------------------------
 * FLUTTER (Dart) EXPORT (avec resolver)
 * ----------------------------------------------------------- */

function dartStr(v: any): string {
  return String(v ?? "").replace(/'/g, "\\'");
}

function nodeToFlutter(el: ElementData, resolver?: Resolver, depth = 2): string {
  const p = el.props || {};
  const indent = "  ".repeat(depth);
  const labelOrBound = resolveBinding(p, resolver);

  const wrap = (s: string) => `${indent}${s}`;
  const pad = Number(p.p ?? 8);

  // Styles Flutter minimalistes (padding + text)
  switch (el.type) {
    case "button":
      return `${wrap(`ElevatedButton(`)}
${wrap(`  onPressed: () {},`)}
${wrap(`  child: Text('${dartStr(labelOrBound || "Button")}'),`)}
${wrap(`),`)}`;
    case "input":
      return `${wrap(`TextField(`)}
${wrap(`  decoration: InputDecoration(hintText: '${dartStr(labelOrBound || "")}'),`)}
${wrap(`),`)}`;
    case "card":
      return `${wrap(`Container(`)}
${wrap(`  padding: EdgeInsets.all(${pad}),`)}
${wrap(`  child: Text('${dartStr(labelOrBound || "Card")}'),`)}
${wrap(`),`)}`;
    case "group":
    case "stack":
      return `${wrap(`Column(`)}
${wrap(`  children: [`)}
${(el.children || []).map((c) => nodeToFlutter(c, resolver, depth + 2)).join("\n")}
${wrap(`  ],`)}
${wrap(`),`)}`;
    case "grid":
      return `${wrap(`Wrap(`)}
${wrap(`  spacing: ${Number(p.gap ?? 12)},`)}
${wrap(`  runSpacing: ${Number(p.gap ?? 12)},`)}
${wrap(`  children: [`)}
${(el.children || []).map((c) => nodeToFlutter(c, resolver, depth + 2)).join("\n")}
${wrap(`  ],`)}
${wrap(`),`)}`;
    case "image":
      return `${wrap(`Image.network('${dartStr(p.src || "https://via.placeholder.com/640x360?text=Image")}'),`)}`;
    case "video":
      return `${wrap(`Container(`)}
${wrap(`  padding: EdgeInsets.all(${pad}),`)}
${wrap(`  child: Text('Video placeholder'),`)}
${wrap(`),`)}`;

    case "navbar":
      return `${wrap(`Container(`)}
${wrap(`  padding: EdgeInsets.all(${pad}),`)}
${wrap(`  child: Text('${dartStr(p.brand || "UInova")}'),`)}
${wrap(`),`)}`;
    case "footer":
      return `${wrap(`Container(`)}
${wrap(`  padding: EdgeInsets.all(${pad}),`)}
${wrap(`  child: Text('${dartStr(p.text || `© ${new Date().getFullYear()} UInova`)}'),`)}
${wrap(`),`)}`;

    case "tabs":
      return `${wrap(`Column(`)}
${wrap(`  children: [`)}
${wrap(`    Text('${dartStr((p.tabs?.[Number(p.active ?? 0)]?.label) || "Tab")}'),`)}
${wrap(`    Text('${dartStr((p.tabs?.[Number(p.active ?? 0)]?.content) || "")}'),`)}
${wrap(`  ],`)}
${wrap(`),`)}`;
    case "accordion":
      return `${wrap(`Column(`)}
${wrap(`  children: [`)}
${(p.items || [{ title: "Item 1", content: "Content 1" }])
  .map((it: any) => `${indent}    Column(children:[Text('${dartStr(it.title)}'), Text('${dartStr(it.content)}')],),`)
  .join("\n")}
${wrap(`  ],`)}
${wrap(`),`)}`;

    case "form":
      return `${wrap(`Column(`)}
${wrap(`  children: [`)}
${(el.children || []).map((c) => nodeToFlutter(c, resolver, depth + 2)).join("\n")}
${wrap(`    ElevatedButton(onPressed: () {}, child: Text('${dartStr(p.submitLabel || "Envoyer")}')),`)}
${wrap(`  ],`)}
${wrap(`),`)}`;
    case "textarea":
      return `${wrap(`TextField(maxLines: 4, decoration: InputDecoration(hintText: '${dartStr(labelOrBound || "Textarea")}')),`)}`;
    case "select":
      return `${wrap(`DropdownButton<String>(items: [DropdownMenuItem(value:'1',child: Text('${dartStr((p.options?.[0]) || "Option")}'))], onChanged: (_){},),`)}`;
    case "radio":
      return `${wrap(`Row(children: [Text('Radio ${dartStr((p.options?.[0]) || "A")}')]),`)}`;
    case "checkbox":
      return `${wrap(`Row(children: [Text('${dartStr(labelOrBound || "Checkbox")}')]),`)}`;

    case "hero":
      return `${wrap(`Column(children:[Text('${dartStr(p.title || "Construisez plus vite avec UInova")}'), Text('${dartStr(p.subtitle || "Éditeur visuel, export multi-formats, collaboration live.")}'), ElevatedButton(onPressed:(){}, child: Text('${dartStr(p.cta || "Commencer")}'))],),`)}`;
    case "pricing":
      return `${wrap(`Column(children:[Text('Pricing'),`)}
${((p.plans || []) as any[])
  .map((pl: any) => `${indent}  Column(children:[Text('${dartStr(pl.name)}'), Text('${dartStr(pl.price)}')]),`)
  .join("\n")}
${wrap(`],),`)}`;
    case "features":
      return `${wrap(`Column(children:[Text('Features'),`)}
${((p.items || []) as any[])
  .map((f: any) => `${indent}  Column(children:[Text('${dartStr(f.title)}'), Text('${dartStr(f.subtitle || "")}')],),`)
  .join("\n")}
${wrap(`],),`)}`;

    default:
      return `${wrap(`Text('${dartStr(labelOrBound || el.type)}'),`)}`;
  }
}

export function generateFlutterWithResolver(elements: ElementData[], resolver?: Resolver): string {
  return `Column(
  children: [
${elements.map((e) => nodeToFlutter(e, resolver, 2)).join("\n")}
  ],
);`;
}

/* -----------------------------------------------------------
 * JSON / IMPORT
 * ----------------------------------------------------------- */
export function generateJSON(elements: ElementData[]): string {
  return JSON.stringify(elements, null, 2);
}

export function importJSON(jsonString: string): ElementData[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) throw new Error("Données invalides");
    return parsed;
  } catch (e: any) {
    alert("Erreur d'import JSON : " + e?.message || e);
    return [];
  }
}

/* -----------------------------------------------------------
 * ZIP (page) et ZIP SITE (multi-pages)
 * ----------------------------------------------------------- */

export async function generateZip(elements: ElementData[], resolver?: Resolver): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file("export.html", generateHTMLWithResolver(elements, resolver));
  zip.file("ExportedComponent.jsx", generateReactWithResolver(elements, resolver));
  zip.file("ExportedComponent.vue", generateVueWithResolver(elements, resolver));
  zip.file("export.dart", generateFlutterWithResolver(elements, resolver));
  zip.file("export.json", generateJSON(elements));

  return zip.generateAsync({ type: "blob" });
}

export async function generateProjectZip(
  project: { id: string; name: string; pages: { id: string; name: string; elements: ElementData[] }[] },
  resolver?: Resolver
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // index
  const index = `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(
    project.name || "UInova Site"
  )}</title></head>
<body>
  <h1>${escapeHtml(project.name || "UInova Site")}</h1>
  <ul>
    ${project.pages.map((p) => `<li><a href="./pages/${p.id}.html">${escapeHtml(p.name || p.id)}</a></li>`).join("")}
  </ul>
</body></html>`;
  zip.file("index.html", index);

  // pages
  const folder = zip.folder("pages");
  if (folder) {
    for (const p of project.pages) {
      folder.file(`${p.id}.html`, generateHTMLWithResolver(p.elements, resolver));
    }
  }

  // project.json
  zip.file(
    "project.json",
    JSON.stringify(
      {
        id: project.id,
        name: project.name,
        pages: project.pages.map((p) => ({ id: p.id, name: p.name })),
      },
      null,
      2
    )
  );

  return zip.generateAsync({ type: "blob" });
}

/* -----------------------------------------------------------
 * DOWNLOAD util
 * ----------------------------------------------------------- */

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
