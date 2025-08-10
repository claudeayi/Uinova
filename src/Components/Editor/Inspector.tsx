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
  return getElementByPath((tree[h].children || []), r);
}

const colorOptions = Object.entries(colors).map(([k, v]) => ({ key: k, val: v }));
const spaceOptions = Object.entries(space).map(([k, v]) => ({ key: k, val: v }));
const fontOptions  = Object.entries(font).map(([k, v]) => ({ key: k, val: v }));

/* ---------------------------
 * Petits éditeurs réutilisables
 * --------------------------- */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <div className="mt-1">{children}</div>
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
      className="border rounded px-2 py-1 w-full"
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
    />
  );
}

/** Liste simple de chaînes (Select options / Radio options) */
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
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {(value || []).map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            value={v}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={placeholder}
          />
          <button type="button" className="px-2 py-1 border rounded" onClick={() => rm(i)}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="px-2 py-1 border rounded w-full" onClick={add}>
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
  const add = () => onChange([...(value || []), { label: "Nouvel onglet", content: "…" }]);
  const setAt = (idx: number, k: "label" | "content", v: string) => {
    const next = value.map((t, i) => (i === idx ? { ...t, [k]: v } : t));
    onChange(next);
  };
  const rm = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {(value || []).map((t, i) => (
        <div key={i} className="p-2 border rounded space-y-2">
          <Row label={`Label #${i + 1}`}>
            <input
              className="border rounded px-2 py-1 w-full"
              value={t.label}
              onChange={(e) => setAt(i, "label", e.target.value)}
            />
          </Row>
          <Row label="Contenu">
            <textarea
              className="border rounded px-2 py-1 w-full"
              rows={2}
              value={t.content || ""}
              onChange={(e) => setAt(i, "content", e.target.value)}
            />
          </Row>
          <div className="flex justify-end">
            <button type="button" className="px-2 py-1 border rounded" onClick={() => rm(i)}>
              Supprimer
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="px-2 py-1 border rounded w-full" onClick={add}>
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
  const add = () => onChange([...(value || []), { title: "Titre", content: "Contenu" }]);
  const setAt = (idx: number, k: "title" | "content", v: string) => {
    onChange(value.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
  };
  const rm = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {(value || []).map((it, i) => (
        <div key={i} className="p-2 border rounded space-y-2">
          <Row label={`Titre #${i + 1}`}>
            <input
             
