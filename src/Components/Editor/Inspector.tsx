import { ElementData, useAppStore } from "../../store/useAppStore";
import { useMemo } from "react";
import { useCMS } from "../../store/useCMS";
import { colors, space, font } from "../../themes/tokens";

function getElementByPath(tree: ElementData[], path: number[]): ElementData {
  if (path.length === 1) return tree[path[0]];
  const [h, ...r] = path;
  return getElementByPath((tree[h].children || []), r);
}

const colorOptions = Object.entries(colors).map(([k, v]) => ({ key: k, val: v }));
const spaceOptions = Object.entries(space).map(([k, v]) => ({ key: k, val: v }));
const fontOptions  = Object.entries(font).map(([k, v]) => ({ key: k, val: v }));

export default function Inspector({
  selectedPath,
  onPatchProps,
}: {
  selectedPath: number[] | null;
  onPatchProps: (patch: Partial<ElementData["props"]>) => void;
}) {
  const { projects, currentProjectId, currentPageId } = useAppStore();
  const { collections } = useCMS();

  const page = useMemo(() => {
    const proj = projects.find((p) => p.id === currentProjectId);
    return proj?.pages.find((p) => p.id === currentPageId);
  }, [projects, currentProjectId, currentPageId]);

  if (!selectedPath || !page) {
    return (
      <aside className="w-80 p-4 border-l bg-white dark:bg-gray-900">
        <h3 className="font-semibold mb-2">Inspector</h3>
        <div className="text-sm text-gray-500">Sélectionne un élément.</div>
      </aside>
    );
  }

  const el = getElementByPath(page.elements, selectedPath);
  const p = el.props || {};

  return (
    <aside className="w-80 p-4 border-l bg-white dark:bg-gray-900 space-y-3">
      <h3 className="font-semibold">Inspector</h3>
      <div className="text-xs text-gray-500">
        {el.type} • {el.id.slice(0, 6)}
      </div>

      {/* Content */}
      <label className="block">
        <span className="text-sm">Label / Text</span>
        <input
          className="mt-1 border rounded px-2 py-1 w-full"
          value={p.label || ""}
          onChange={(e) => onPatchProps({ label: e.target.value })}
        />
      </label>

      {/* Styles rapides (numériques) */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-sm">Font size</span>
          <input
            type="number"
            className="mt-1 border rounded px-2 py-1 w-full"
            value={p.fontSize ?? 16}
            onChange={(e) => onPatchProps({ fontSize: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-sm">Padding</span>
          <input
            type="number"
            className="mt-1 border rounded px-2 py-1 w-full"
            value={p.p ?? 8}
            onChange={(e) => onPatchProps({ p: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Styles via tokens */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-sm">BG (token)</span>
          <select
            className="mt-1 border rounded px-2 py-1 w-full"
            value={colorOptions.find((o) => o.val === p.bg)?.key || ""}
            onChange={(e) => {
              const key = e.target.value;
              onPatchProps({ bg: key ? colors[key as keyof typeof colors] : undefined });
            }}
          >
            <option value="">—</option>
            {colorOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.key}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm">Couleur (token)</span>
          <select
            className="mt-1 border rounded px-2 py-1 w-full"
            value={colorOptions.find((o) => o.val === p.color)?.key || ""}
            onChange={(e) => {
              const key = e.target.value;
              onPatchProps({ color: key ? colors[key as keyof typeof colors] : undefined });
            }}
          >
            <option value="">—</option>
            {colorOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.key}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-sm">Padding (token)</span>
          <select
            className="mt-1 border rounded px-2 py-1 w-full"
            value={String(p.p ?? "")}
            onChange={(e) => onPatchProps({ p: Number(e.target.value) })}
          >
            <option value="">—</option>
            {spaceOptions.map((o) => (
              <option key={o.key} value={o.val}>{o.key} ({o.val}px)</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Font size (token)</span>
          <select
            className="mt-1 border rounded px-2 py-1 w-full"
            value={String(p.fontSize ?? "")}
            onChange={(e) => onPatchProps({ fontSize: Number(e.target.value) })}
          >
            <option value="">—</option>
            {fontOptions.map((o) => (
              <option key={o.key} value={o.val}>{o.key} ({o.val}px)</option>
            ))}
          </select>
        </label>
      </div>

      {/* Layout */}
      <div>
        <div className="text-sm mb-1">Layout</div>
        <div className="grid grid-cols-3 gap-2">
          <button className="border rounded px-2 py-1" onClick={() => onPatchProps({ display: "block" })}>Block</button>
          <button className="border rounded px-2 py-1" onClick={() => onPatchProps({ display: "inline-block" })}>Inline</button>
          <button className="border rounded px-2 py-1" onClick={() => onPatchProps({ display: "flex" })}>Flex</button>
        </div>
      </div>

      {/* CMS binding */}
      <section className="p-3 border rounded">
        <div className="font-semibold mb-2">Données (CMS)</div>

        <label className="text-sm block mb-1">Collection</label>
        <select
          className="w-full border rounded px-2 py-1 mb-2"
          value={p._binding?.collectionId || ""}
          onChange={(e) =>
            onPatchProps({ _binding: { collectionId: e.target.value, field: p._binding?.field || "" } })
          }
        >
          <option value="">— Aucune —</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label className="text-sm block mb-1">Champ</label>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="ex: title"
          value={p._binding?.field || ""}
          onChange={(e) =>
            onPatchProps({ _binding: { collectionId: p._binding?.collectionId || "", field: e.target.value } })
          }
        />
        <p className="text-xs opacity-70 mt-2">
          Renseigne un champ existant de la collection (ex: title, subtitle, image).
        </p>
      </section>
    </aside>
  );
}
