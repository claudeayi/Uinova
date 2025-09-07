// src/components/editor/Inspector.tsx
import React, { useMemo } from "react";
import { ElementData, useAppStore } from "../../store/useAppStore";
import { useCMS } from "../../store/useCMS";
import { colors, space, font } from "../../themes/tokens";

/* ---------------------------
 * Utils
 * --------------------------- */
function getElementByPath(tree: ElementData[], path: number[]): ElementData {
  if (path.length === 1) return tree[path[0]];
  const [h, ...r] = path;
  return getElementByPath(tree[h].children || [], r);
}

const colorOptions = Object.entries(colors).map(([k, v]) => ({ key: k, val: v }));
const spaceOptions = Object.entries(space).map(([k, v]) => ({ key: k, val: v }));
const fontOptions = Object.entries(font).map(([k, v]) => ({ key: k, val: v }));

/* ---------------------------
 * Helpers UI
 * --------------------------- */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div>{children}</div>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      className="border rounded px-2 py-1 w-full dark:bg-slate-900 dark:border-slate-700"
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
    />
  );
}

/* ---------------------------
 * Editors
 * --------------------------- */

/** Liste simple de chaînes (Select / Radio options) */
function StringListEditor({
  value,
  onChange,
  placeholder = "Entrée…",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const add = () => onChange([...(value || []), "Nouvelle valeur"]);
  const setAt = (idx: number, v: string) => {
    const next = [...value];
    next[idx] = v;
    onChange(next);
  };
  const rm = (idx: number) => {
    if (confirm("Supprimer cet élément ?")) {
      const next = value.filter((_, i) => i !== idx);
      onChange(next);
    }
  };

  return (
    <div className="space-y-2">
      {(value || []).map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1 dark:bg-slate-900 dark:border-slate-700"
            value={v}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="px-2 py-1 border rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => rm(i)}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="px-2 py-1 border rounded w-full hover:bg-gray-100 dark:hover:bg-slate-700"
        onClick={add}
      >
        + Ajouter
      </button>
    </div>
  );
}

/** Tabs {label, content}[] */
function TabsEditor({
  value,
  onChange,
}: {
  value: { label: string; content?: string }[];
  onChange: (next: { label: string; content?: string }[]) => void;
}) {
  const add = () =>
    onChange([...(value || []), { label: "Nouvel onglet", content: "…" }]);
  const setAt = (idx: number, k: "label" | "content", v: string) => {
    const next = value.map((t, i) => (i === idx ? { ...t, [k]: v } : t));
    onChange(next);
  };
  const rm = (idx: number) =>
    confirm("Supprimer cet onglet ?") &&
    onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {(value || []).map((t, i) => (
        <div
          key={i}
          className="p-2 border rounded space-y-2 dark:border-slate-700"
        >
          <Row label={`Label #${i + 1}`}>
            <input
              className="border rounded px-2 py-1 w-full dark:bg-slate-900 dark:border-slate-700"
              value={t.label}
              onChange={(e) => setAt(i, "label", e.target.value)}
            />
          </Row>
          <Row label="Contenu">
            <textarea
              className="border rounded px-2 py-1 w-full dark:bg-slate-900 dark:border-slate-700"
              rows={2}
              value={t.content || ""}
              onChange={(e) => setAt(i, "content", e.target.value)}
            />
          </Row>
          <div className="flex justify-end">
            <button
              type="button"
              className="px-2 py-1 border rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => rm(i)}
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="px-2 py-1 border rounded w-full hover:bg-gray-100 dark:hover:bg-slate-700"
        onClick={add}
      >
        + Ajouter un onglet
      </button>
    </div>
  );
}

/** Accordion items {title, content}[] */
function AccordionEditor({
  value,
  onChange,
}: {
  value: { title: string; content: string }[];
  onChange: (next: { title: string; content: string }[]) => void;
}) {
  const add = () =>
    onChange([...(value || []), { title: "Titre", content: "Contenu" }]);
  const setAt = (idx: number, k: "title" | "content", v: string) => {
    onChange(value.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
  };
  const rm = (idx: number) =>
    confirm("Supprimer cet élément ?") &&
    onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {(value || []).map((it, i) => (
        <div
          key={i}
          className="p-2 border rounded space-y-2 dark:border-slate-700"
        >
          <Row label={`Titre #${i + 1}`}>
            <input
              className="border rounded px-2 py-1 w-full dark:bg-slate-900 dark:border-slate-700"
              value={it.title}
              onChange={(e) => setAt(i, "title", e.target.value)}
            />
          </Row>
          <Row label="Contenu">
            <textarea
              className="border rounded px-2 py-1 w-full dark:bg-slate-900 dark:border-slate-700"
              rows={2}
              value={it.content}
              onChange={(e) => setAt(i, "content", e.target.value)}
            />
          </Row>
          <div className="flex justify-end">
            <button
              type="button"
              className="px-2 py-1 border rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => rm(i)}
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="px-2 py-1 border rounded w-full hover:bg-gray-100 dark:hover:bg-slate-700"
        onClick={add}
      >
        + Ajouter un item
      </button>
    </div>
  );
}

/** Sélecteur de couleurs */
function ColorPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  return (
    <select
      className="border rounded px-2 py-1 w-full dark:bg-slate-900 dark:border-slate-700"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {colorOptions.map((c) => (
        <option key={c.key} value={c.val}>
          {c.key}
        </option>
      ))}
    </select>
  );
}

/** Toggle switch */
function Switch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
        value
          ? "bg-blue-600 justify-end"
          : "bg-gray-300 dark:bg-slate-700 justify-start"
      }`}
    >
      <div className="w-4 h-4 bg-white rounded-full shadow" />
    </button>
  );
}
