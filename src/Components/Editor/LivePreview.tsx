import { ElementData } from "../../store/useAppStore";
import { useCMS } from "../../store/cmsStore";

const styleFromProps = (p: Record<string, any>) => {
  const s: React.CSSProperties = {};
  if (p.bg) s.background = p.bg;
  if (p.color) s.color = p.color;
  if (p.p !== undefined) s.padding = p.p;
  if (p.fontSize) s.fontSize = p.fontSize;
  if (p.display) s.display = p.display;
  return s;
};

function renderNode(el: ElementData, indexKey: string) {
  const p = el.props || {};
  if (el.type === "button")
    return (
      <button key={indexKey} style={styleFromProps(p)} className="px-3 py-1 rounded mr-2 bg-blue-600 text-white">
        {p.label || "Button"}
      </button>
    );
  if (el.type === "input")
    return (
      <input key={indexKey} style={styleFromProps(p)} className="border px-2 py-1 rounded mr-2" placeholder={p.label || ""} />
    );
  if (el.type === "card")
    return (
      <div key={indexKey} style={styleFromProps(p)} className="inline-block p-2 bg-gray-100 dark:bg-gray-700 rounded mr-2">
        {p.label || "Card"}
      </div>
    );
  if (el.type === "group")
    return (
      <div key={indexKey} style={styleFromProps(p)} className="inline-block">
        {(el.children || []).map((c, i) => renderNode(c, `${indexKey}-${i}`))}
      </div>
    );
  return null;
}

export default function LivePreview({ elements }: { elements: ElementData[] }) {
  const { getCollection } = useCMS();

  // Binding : si un group a props.bind = collectionId, on itère la collection
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
                label: String((c.props?.label || "")).replace(/\{\{(\w+)\}\}/g, (_, k) => item[k] ?? ""),
              },
            })),
          };
          return renderNode(materialized, `b-${idx}-${i}`);
        });
      }
      return [renderNode(el, `n-${idx}`)];
    });
  }

  return (
    <div className="p-4 border rounded bg-gray-50 dark:bg-gray-800 mb-4">
      <div className="font-bold mb-2">Aperçu en direct</div>
      <div>{renderWithBinding(elements)}</div>
    </div>
  );
}
