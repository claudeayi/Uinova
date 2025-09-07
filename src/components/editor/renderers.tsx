// src/components/editor/renderers.tsx
import React from "react";
import type { ElementData } from "../../store/useAppStore";

/* -----------------------------
 * Utils: classes + styles
 * ----------------------------- */
function classNames(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}
function styleFromProps(p: any): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (p?.bg) s.background = p.bg;
  if (p?.color) s.color = p.color;
  if (p?.p != null) s.padding = Number(p.p);
  if (p?.m != null) s.margin = Number(p.m);
  if (p?.fontSize != null) s.fontSize = Number(p.fontSize);
  if (p?.radius != null) s.borderRadius = Number(p.radius);
  if (p?.w) s.width = p.w;
  if (p?.h) s.height = p.h;
  if (p?.align) s.textAlign = p.align;
  if (p?.shadow) s.boxShadow = p.shadow;
  if (p?.display) s.display = p.display;
  if (p?.justify) s.justifyContent = p.justify;
  if (p?.items) s.alignItems = p.items;
  return s;
}

/* -----------------------------
 * Generic node renderer
 * ----------------------------- */
export function renderNode(el: ElementData): React.ReactNode {
  const p = el.props || {};
  const style = styleFromProps(p);

  switch (el.type) {
    /** ======= Base ======= */
    case "button":
      return (
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={style}
          aria-label={p.label || "Button"}
        >
          {p.label || "Button"}
        </button>
      );

    case "input":
      return (
        <input
          className="border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
          style={style}
          placeholder={p.placeholder || p.label || ""}
          readOnly={p.readOnly}
          disabled={p.disabled}
          aria-label={p.label || "Input field"}
        />
      );

    case "card":
      return (
        <div
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border"
          style={style}
        >
          {p.image && (
            <img
              src={p.image}
              alt={p.label || "Card image"}
              className="w-full h-32 object-cover rounded mb-2"
            />
          )}
          <div className="font-semibold mb-1">{p.label || "Card"}</div>
          <div className="text-sm opacity-80">{p.content || ""}</div>
        </div>
      );

    case "group":
      return (
        <div className="p-2 border-2 border-dashed rounded" style={style}>
          <div className="font-semibold mb-1">{p.label || "Groupe"}</div>
          <div className="ml-2 space-y-2">{(el.children || []).map(childRenderer)}</div>
        </div>
      );

    /** ======= Layouts ======= */
    case "grid": {
      const cols = Number(p.cols ?? 2);
      const gap = Number(p.gap ?? 12);
      return (
        <div
          style={{
            ...style,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap,
          }}
          className="rounded border"
        >
          {(el.children || []).map(childRenderer)}
        </div>
      );
    }

    case "stack": {
      const direction = p.direction === "row" ? "row" : "column";
      const gap = Number(p.gap ?? 8);
      return (
        <div
          style={{ ...style, display: "flex", flexDirection: direction, gap }}
          className="rounded"
        >
          {(el.children || []).map(childRenderer)}
        </div>
      );
    }

    /** ======= Media ======= */
    case "image":
      return (
        <img
          src={p.src || "https://via.placeholder.com/640x360?text=Image"}
          alt={p.alt || "image"}
          loading="lazy"
          style={{ ...style, maxWidth: "100%", borderRadius: 8 }}
          className="shadow-sm"
        />
      );

    case "video":
      return (
        <div style={style} className="rounded overflow-hidden">
          <video
            src={p.src || ""}
            controls
            className="w-full rounded"
            poster={p.poster || "https://via.placeholder.com/640x360?text=Video"}
          />
        </div>
      );

    /** ======= Navigation ======= */
    case "navbar": {
      const items: string[] = p.items || ["Home", "About", "Contact"];
      return (
        <nav
          className="w-full bg-gray-900 text-white px-4 py-2 rounded"
          style={style}
          role="navigation"
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="font-bold">{p.brand || "UInova"}</div>
            <div className="flex gap-4 text-sm">
              {items.map((it, i) => (
                <a key={i} href="#" className="opacity-90 hover:opacity-100">
                  {it}
                </a>
              ))}
            </div>
          </div>
        </nav>
      );
    }

    case "footer":
      return (
        <footer
          className="w-full px-4 py-6 bg-gray-100 dark:bg-gray-800 rounded"
          style={style}
        >
          <div className="max-w-5xl mx-auto text-sm opacity-80">
            {p.text || `© ${new Date().getFullYear()} UInova. All rights reserved.`}
          </div>
        </footer>
      );

    /** ======= Tabs ======= */
    case "tabs": {
      const tabs: { label: string; content?: string }[] = p.tabs || [
        { label: "Tab 1", content: "Content 1" },
        { label: "Tab 2", content: "Content 2" },
      ];
      const active = Number(p.active ?? 0);
      return (
        <div className="border rounded" style={style} role="tablist">
          <div className="flex border-b">
            {tabs.map((t, i) => (
              <div
                key={i}
                role="tab"
                aria-selected={i === active}
                className={classNames(
                  "px-3 py-2 text-sm cursor-default",
                  i === active
                    ? "bg-white dark:bg-gray-900 font-semibold"
                    : "bg-gray-50 dark:bg-gray-800"
                )}
              >
                {t.label}
              </div>
            ))}
          </div>
          <div className="p-3 text-sm" role="tabpanel">
            {tabs[active]?.content || "…"}
          </div>
        </div>
      );
    }

    /** ======= Accordion ======= */
    case "accordion": {
      const items: { title: string; content: string }[] = p.items || [
        { title: "Item 1", content: "Content 1" },
        { title: "Item 2", content: "Content 2" },
      ];
      return (
        <div className="rounded border divide-y" style={style} role="region">
          {items.map((it, i) => (
            <div key={i} className="p-3">
              <div className="font-medium">{it.title}</div>
              <div className="text-sm opacity-80 mt-1">{it.content}</div>
            </div>
          ))}
        </div>
      );
    }

    /** ======= Forms ======= */
    case "form":
      return (
        <form
          className="space-y-2"
          style={style}
          onSubmit={(e) => e.preventDefault()}
          role="form"
        >
          {(el.children || []).map(childRenderer)}
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
            {p.submitLabel || "Envoyer"}
          </button>
        </form>
      );

    case "textarea":
      return (
        <textarea
          className="border px-2 py-1 rounded w-full focus:ring-2 focus:ring-blue-400"
          style={style}
          placeholder={p.label || "Textarea"}
          readOnly={p.readOnly}
          disabled={p.disabled}
          aria-label={p.label || "Textarea"}
        />
      );

    case "select": {
      const options: string[] = p.options || ["Option 1", "Option 2"];
      return (
        <select
          className="border px-2 py-1 rounded focus:ring-2 focus:ring-blue-400"
          style={style}
          defaultValue=""
          aria-label={p.label || "Select"}
        >
          <option value="" disabled hidden>
            {p.label || "Select"}
          </option>
          {options.map((o, i) => (
            <option key={i} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    case "radio": {
      const options: string[] = p.options || ["A", "B", "C"];
      return (
        <div style={style} className="flex gap-3" role="radiogroup">
          {options.map((o, i) => (
            <label key={i} className="inline-flex items-center gap-1">
              <input type="radio" name={el.id} disabled aria-checked="false" />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
    }

    case "checkbox":
      return (
        <label
          className="inline-flex items-center gap-2"
          style={style}
          role="checkbox"
          aria-checked="false"
        >
          <input type="checkbox" disabled />
          <span>{p.label || "Checkbox"}</span>
        </label>
      );

    /** ======= Sections ======= */
    case "hero":
      return (
        <section
          className="rounded bg-gray-100 dark:bg-gray-800 p-8 text-center"
          style={style}
        >
          <h1 className="text-3xl font-bold mb-3">
            {p.title || "Construisez plus vite avec UInova"}
          </h1>
          <p className="opacity-80 mb-5 text-lg">
            {p.subtitle ||
              "Éditeur visuel, export multi-formats, collaboration live."}
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow">
            {p.cta || "Commencer"}
          </button>
        </section>
      );

    case "pricing": {
      const plans =
        p.plans || [
          { name: "Free", price: "0€", features: ["1 projet", "Export HTML"] },
          {
            name: "Pro",
            price: "19€/mo",
            features: ["Projets illimités", "Export ZIP Site"],
          },
        ];
      return (
        <section
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          style={style}
        >
          {plans.map((pl: any, i: number) => (
            <div
              key={i}
              className="rounded-lg border p-6 shadow-sm bg-white dark:bg-gray-900"
            >
              <div className="text-lg font-semibold">{pl.name}</div>
              <div className="text-3xl font-bold my-3">{pl.price}</div>
              <ul className="text-sm space-y-1">
                {(pl.features || []).map((f: string, j: number) => (
                  <li key={j}>• {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      );
    }

    case "features": {
      const feats: { title: string; subtitle?: string }[] =
        p.items || [
          { title: "Rapide", subtitle: "Build en minutes" },
          { title: "Collaboratif", subtitle: "Édition live" },
          { title: "Exportable", subtitle: "HTML/React/Vue/Flutter" },
        ];
      return (
        <section
          className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto"
          style={style}
        >
          {feats.map((f, i) => (
            <div
              key={i}
              className="rounded-lg border p-4 bg-white dark:bg-gray-900 shadow-sm"
            >
              <div className="font-semibold text-lg">{f.title}</div>
              <div className="text-sm opacity-80">{f.subtitle}</div>
            </div>
          ))}
        </section>
      );
    }

    /** ======= Fallback ======= */
    default:
      return (
        <div
          style={style}
          className="px-2 py-1 border rounded bg-yellow-50 text-yellow-800 text-xs"
        >
          {p.label || el.type} (non supporté)
        </div>
      );
  }
}

/* -----------------------------
 * Children renderer
 * ----------------------------- */
function childRenderer(child: ElementData, idx: number) {
  return (
    <div key={child.id || idx} className="mt-2">
      {renderNode(child)}
    </div>
  );
}
