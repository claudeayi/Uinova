// src/components/editor/LivePreview.tsx
import React, { useState } from "react";
import { ElementData } from "../../store/useAppStore";
import { useCMS } from "../../store/cmsStore";

/* ---------------------------
 * Utils styles
 * --------------------------- */
const styleFromProps = (p: Record<string, any>) => {
  const s: React.CSSProperties = {};
  if (p.bg) s.background = p.bg;
  if (p.color) s.color = p.color;
  if (p.p !== undefined) s.padding = p.p;
  if (p.fontSize) s.fontSize = p.fontSize;
  if (p.display) s.display = p.display;
  return s;
};

/* ---------------------------
 * Rendu d’un élément
 * --------------------------- */
function renderNode(el: ElementData, indexKey: string) {
  const p = el.props || {};
  if (el.type === "button")
    return (
      <button
        key={indexKey}
        style={styleFromProps(p)}
        className="px-3 py-1 rounded mr-2 bg-blue-600 text-white"
      >
        {p.label || "Button"}
      </button>
    );
  if (el.type === "input")
    return (
      <input
        key={indexKey}
        style={styleFromProps(p)}
        className="border px-2 py-1 rounded mr-2"
        placeholder={p.label || ""}
      />
    );
  if (el.type === "card")
    return (
      <div
        key={indexKey}
        style={styleFromProps(p)}
        className="inline-block p-2 bg-gray-100 dark:bg-gray-700 rounded mr-2"
      >
        {p.label || "Card"}
      </div>
    );
  if (el.type === "group")
    return (
      <div key={indexKey} style={styleFromProps(p)} className="inline-block">
        {(el.children || []).map((c, i) =>
          renderNode(c, `${indexKey}-${i}`)
        )}
      </div>
    );
  return null;
}

/* ---------------------------
 * LivePreview principal
 * --------------------------- */
export default function LivePreview({
  elements,
  html,
}: {
  elements?: ElementData[];
  html?: string;
}) {
  const { getCollection } = useCMS();
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">(
    "desktop"
  );

  // Binding CMS (mode builder)
  function renderWithBinding(els: ElementData[]) {
    return els.flatMap((el, idx) => {
      if (el.type === "group" && el.props?.bind) {
        const col = getCollection(el.props.bind);
        if (!col) return [renderNode(el, `n-${idx}`)];
        return col.items.map((item, i) => {
          const materialized: ElementData = {
            ...el,
            children: (el.children || []).map((c) => ({
              ...c,
              props: {
                ...c.props,
                label: String(c.props?.label || "").replace(
                  /\{\{(\w+)\}\}/g,
                  (_, k) => item[k] ?? ""
                ),
              },
            })),
          };
          return renderNode(materialized, `b-${idx}-${i}`);
        });
      }
      return [renderNode(el, `n-${idx}`)];
    });
  }

  /* ---------------------------
   * UI Preview
   * --------------------------- */
  return (
    <div className="p-4 border rounded bg-gray-50 dark:bg-gray-800 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold">Aperçu en direct</span>
        <div className="flex gap-2">
          <button
            onClick={() => setDevice("mobile")}
            className={`px-2 py-1 rounded text-sm ${
              device === "mobile"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-slate-700"
            }`}
          >
            📱 Mobile
          </button>
          <button
            onClick={() => setDevice("tablet")}
            className={`px-2 py-1 rounded text-sm ${
              device === "tablet"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-slate-700"
            }`}
          >
            💻 Tablette
          </button>
          <button
            onClick={() => setDevice("desktop")}
            className={`px-2 py-1 rounded text-sm ${
              device === "desktop"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-slate-700"
            }`}
          >
            🖥️ Desktop
          </button>
        </div>
      </div>

      {/* Mode éléments (builder) */}
      {elements && (
        <div
          style={{
            width: device === "mobile" ? 375 : device === "tablet" ? 800 : "100%",
          }}
          className="border rounded p-3 bg-white dark:bg-slate-900"
        >
          {renderWithBinding(elements)}
        </div>
      )}

      {/* Mode HTML export */}
      {html && (
        <iframe
          title="preview"
          style={{
            width: device === "mobile" ? 375 : device === "tablet" ? 800 : "100%",
            height: 600,
            border: "1px solid #ddd",
            background: "#fff",
          }}
          className="rounded"
          srcDoc={html}
        />
      )}
    </div>
  );
}
