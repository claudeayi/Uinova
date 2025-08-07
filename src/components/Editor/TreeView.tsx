import { ElementData } from "../../store/useAppStore";

function Node({
  el,
  path,
  onSelect,
}: {
  el: ElementData;
  path: number[];
  onSelect: (path: number[]) => void;
}) {
  return (
    <div className="ml-2">
      <button
        className="text-left w-full px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        onClick={() => onSelect(path)}
      >
        {el.type} • {el.props?.label || ""}
      </button>
      {el.children && el.children.length > 0 && (
        <div className="ml-2 border-l pl-2">
          {el.children.map((c, i) => (
            <Node key={c.id} el={c} path={[...path, i]} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({
  elements,
  onSelect,
}: {
  elements: ElementData[];
  onSelect: (path: number[]) => void;
}) {
  return (
    <aside className="w-64 p-3 border-r bg-gray-50 dark:bg-gray-900">
      <h3 className="font-semibold mb-2">Structure</h3>
      <div>
        {elements.length === 0 && (
          <div className="text-sm text-gray-500">Aucun élément</div>
        )}
        {elements.map((el, i) => (
          <Node key={el.id} el={el} path={[i]} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  );
}
