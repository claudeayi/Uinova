import { ElementData, useAppStore } from "../../store/useAppStore";
import { useMemo } from "react";

export default function Inspector({
  selectedPath,
  onChange
}: {
  selectedPath: number[] | null;
  onChange: (patch: Partial<ElementData["props"]>) => void;
}) {
  const { projects, currentProjectId, currentPageId } = useAppStore();
  const page = useMemo(() => {
    const proj = projects.find(p => p.id === currentProjectId);
    return proj?.pages.find(p => p.id === currentPageId);
  }, [projects, currentProjectId, currentPageId]);

  function getEl(tree: ElementData[], path: number[]): ElementData | null {
    if (!path || path.length === 0) return null;
    if (path.length === 1) return tree[path[0]];
    const [h, ...r] = path;
    return getEl(tree[h].children || [], r);
  }

  const el = selectedPath && page ? getEl(page.elements, selectedPath) : null;
  if (!el) return <div className="w-80 p-4 border-l bg-white dark:bg-gray-900">Aucun élément sélectionné</div>;

  const props = el.props || {};
  return (
    <div className="w-80 p-4 border-l bg-white dark:bg-gray-900 space-y-3">
      <h3 className="font-semibold">Inspector</h3>
      <div className="text-xs text-gray-500">{el.type} • {el.id.slice(0,6)}</div>

      {/* Contenu */}
      <label className="block">
        <span className="text-sm">Label / Text</span>
        <input
          className="mt-1 border rounded px-2 py-1 w-full"
          value={props.label || ""}
          onChange={e => onChange({ label: e.target.value })}
        />
      </label>

      {/* Styles de base */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-sm">Font size</span>
          <input
            type="number"
            className="mt-1 border rounded px-2 py-1 w-full"
            value={props.fontSize || 16}
            onChange={e => onChange({ fontSize: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-sm">Padding</span>
          <input
            type="number"
            className="mt-1 border rounded px-2 py-1 w-full"
            value={props.p || 8}
            onChange={e => onChange({ p: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm">Couleur (hex)</span>
        <input
          className="mt-1 border rounded px-2 py-1 w-full"
          value={props.color || "#ffffff"}
          onChange={e => onChange({ color: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm">Background (hex)</span>
        <input
          className="mt-1 border rounded px-2 py-1 w-full"
          value={props.bg || "#2563eb"}
          onChange={e => onChange({ bg: e.target.value })}
        />
      </label>

      {/* Layout simple */}
      <div>
        <div className="text-sm mb-1">Layout</div>
        <div className="grid grid-cols-3 gap-2">
          <button className="border rounded px-2 py-1" onClick={() => onChange({ display: "block" })}>Block</button>
          <button className="border rounded px-2 py-1" onClick={() => onChange({ display: "inline-block" })}>Inline</button>
          <button className="border rounded px-2 py-1" onClick={() => onChange({ display: "flex" })}>Flex</button>
        </div>
      </div>
    </div>
  );
}
