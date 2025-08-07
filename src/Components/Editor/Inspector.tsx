import { ElementData, useAppStore } from "../../store/useAppStore";
import { useMemo } from "react";

function getElementByPath(tree: ElementData[], path: number[]): ElementData {
  if (path.length === 1) return tree[path[0]];
  const [h, ...r] = path;
  return getElementByPath((tree[h].children || []), r);
}

export default function Inspector({
  selectedPath,
  onPatchProps,
}: {
  selectedPath: number[] | null;
  onPatchProps: (patch: Partial<ElementData["props"]>) => void;
}) {
  const { projects, currentProjectId, currentPageId } = useAppStore();
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

      {/* Styles */}
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

      <label className="block">
        <span className="text-sm">Couleur (hex)</span>
        <input
          className="mt-1 border rounded px-2 py-1 w-full"
          value={p.color || "#ffffff"}
          onChange={(e) => onPatchProps({ color: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm">Background (hex)</span>
        <input
          className="mt-1 border rounded px-2 py-1 w-full"
          value={p.bg || "#2563eb"}
          onChange={(e) => onPatchProps({ bg: e.target.value })}
        />
      </label>

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
      <div>
        <div className="text-sm mb-1">Binding (CMS)</div>
        <input
          className="mt-1 border rounded px-2 py-1 w-full"
          placeholder="collectionId (ex: features)"
          value={p.bind || ""}
          onChange={(e) => onPatchProps({ bind: e.target.value })}
        />
      </div>
    </aside>
  );
}
