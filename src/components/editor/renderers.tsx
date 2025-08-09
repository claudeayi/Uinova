// src/components/editor/renderers.tsx
import React from "react";
import type { ElementData } from "../../store/useAppStore";

/** Utilitaires style */
function classNames(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}
function styleFromProps(p: any): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (p?.bg) s.background = p.bg;
  if (p?.color) s.color = p.color;
  if (p?.p != null) s.padding = Number(p.p);
  if (p?.fontSize != null) s.fontSize = Number(p.fontSize);
  if (p?.display) s.display = p.display;
  return s;
}

/** Rendu générique d’un nœud */
export function renderNode(el: ElementData): React.ReactNode {
  const p = el.props || {};
  const style = styleFromProps(p);

  switch (el.type) {
    /** ======= Base ======= */
    case "button":
      return (
        <button className="bg-blue-600 text-white px-3 py-1 rounded" style={style}>
          {p.label || "Button"}
        </button>
      );

    case "input":
      return (
        <input
          className="border px-2 py-1 rounded"
          style={style}
          placeholder={p.label || ""}
          readOnly
        />
      );

    case "card":
      return (
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded" style={style}>
          {p.label || "Card"}
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
      const gridStyle: React.CSSProperties = {
        ...style,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap,
      };
      return (
        <div style={gridStyle} className="rounded border">
          {(el.children || []).map(childRenderer)}
        </div>
      );
    }

    case "stack": {
      const direction = p.direction === "row" ? "row" : "column";
      const gap = Number(p.gap ?? 8);
      const stackStyle: React.CSSProperties = {
        ...style,
        display: "flex",
        flexDirection: direction,
        gap,
      };
      return <div style={stackStyle}>{(el.children || []).map(childRenderer)}</div>;
    }

    /** ======= Media ======= */
    case "image":
      return (
        <img
          src={p.src || "https://via.placeholder.com/640x360?text=Image"}
          alt={p.alt || "image"}
          style={{ ...style, maxWidth: "100%", borderRadius: 8 }}
        />
      );

    case "video":
      return (
        <div style={style} className="rounded overflow-hidden">
          <video
            src={p.src || ""}
            controls
            className="w-full"
            poster={p.poster || "https://via.placeholder.com/640x360?text=Video"}
          />
        </div>
      );

    /** ======= Navigation / Footer ======= */
    case "navbar": {
      const items: string[] = p.items || ["Home", "About", "Contact"];
      return (
        <nav className="w-full bg-gray-900 text-white px-4 py-2 rounded" style={style}>
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
        <footer className="w-full px-4 py-6 bg-gray-100 dark:bg-gray-800 rounded" style={style}>
          <div className="max-w-5xl mx-auto text-sm opacity-80">
            {p.text || "© " + new Date().getFullYear() + " UInova. All rights reserved."}
          </div>
        </footer>
      );

    /** ======= Tabs / Accordion ======= */
    case "tabs": {
      const tabs: { label: string; content?: string }[] = p.tabs || [
        { label: "Tab 1", content: "Content 1" },
        { label: "Tab 2", content: "Content 2" },
      ];
      const active = Number(p.active ?? 0);
      return (
        <div className="border rounded" style={style}>
          <div className="flex border-b">
            {tabs.map((t, i) => (
              <div
                key={i}
                className={classNames(
                  "px-3 py-2 text-sm cursor-default",
                  i === active ? "bg-white dark:bg-gray-900 font-semibold" : "bg-gray-50 dark:bg-gray-800"
                )}
              >
                {t.label}
              </div>
            ))}
          </div>
          <div className="p-3 text-sm">{tabs[active]?.content || "…"}</div>
        </div>
      );
    }

    case "accordion": {
      const items: { title: string; content: string }[] = p.items || [
        { title: "Item 1", content: "Content 1" },
        { title: "Item 2", content: "Content 2" },
      ];
      return (
        <div className="rounded border divide-y" style={style}>
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
        <form className="space-y-2" style={style} onSubmit={(e) => e.preventDefault()}>
          {(el.children || []).map(childRenderer)}
          <button className="bg-blue-600 text-white px-3 py-1 rounded">{p.submitLabel || "Envoyer"}</button>
        </form>
      );

    case "textarea":
      return <textarea className="border px-2 py-1 rounded w-full" style={style} placeholder={p.label || "Textarea"} readOnly />;

    case "select": {
      const options: string[] = p.options || ["Option 1", "Option 2"];
      return (
        <select className="border px-2 py-1 rounded" style={style} defaultValue="">
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
        <div style={style} className="flex gap-3">
          {options.map((o, i) => (
            <label key={i} className="inline-flex items-center gap-1">
              <input type="radio" name={el.id} disabled />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
    }

    case "checkbox":
      return (
        <label className="inline-flex items-center gap-2" style={style}>
          <input type="checkbox" disabled />
          <span>{p.label || "Checkbox"}</span>
        </label>
      );

    /** ======= Sections ======= */
    case "hero":
      return (
        <section className="rounded bg-gray-100 dark:bg-gray-800 p-8" style={style}>
          <h1 className="text-2xl font-bold mb-2">{p.title || "Construisez plus vite avec UInova"}</h1>
          <p className="opacity-80 mb-4">
            {p.subtitle || "Éditeur visuel, export multi-formats, collaboration live."}
          </p>
          <button className="bg-blue-600 text-white px-3 py-1 rounded">{p.cta || "Commencer"}</button>
        </section>
      );

    case "pricing": {
      const plans =
        p.plans ||
        [
          { name: "Free", price: "0€", features: ["1 projet", "Export HTML"] },
          { name: "Pro", price: "19€/mo", features: ["Projets illimités", "Export ZIP Site"] },
        ];
      return (
        <section className="grid md:grid-cols-2 gap-4" style={style}>
          {plans.map((pl: any, i: number) => (
            <div key={i} className="rounded border p-4">
              <div className="text-lg font-semibold">{pl.name}</div>
              <div className="text-2xl font-bold my-2">{pl.price}</div>
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
        <section className="grid md:grid-cols-3 gap-4" style={style}>
          {feats.map((f, i) => (
            <div key={i} className="rounded border p-4">
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm opacity-80">{f.subtitle}</div>
            </div>
          ))}
        </section>
      );
    }

    default:
      return <div style={style}>{p.label || el.type}</div>;
  }
}

function childRenderer(child: ElementData, idx: number) {
  return (
    <div key={child.id} className="mt-2">
      {renderNode(child)}
    </div>
  );
}
