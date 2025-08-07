import { ElementData } from "../../store/useAppStore";

function renderPreview(elements: ElementData[]) {
  return elements.map((el) => {
    if (el.type === "button")
      return <button key={el.id} className="bg-blue-600 text-white px-3 py-1 rounded mr-2">{el.props.label}</button>;
    if (el.type === "input")
      return <input key={el.id} className="border px-2 py-1 rounded mr-2" placeholder={el.props.label} />;
    if (el.type === "card")
      return <div key={el.id} className="inline-block p-2 bg-gray-100 dark:bg-gray-700 rounded mr-2">{el.props.label}</div>;
    if (el.type === "group")
      return (
        <div key={el.id} className="p-2 border-2 border-dashed rounded mb-2 inline-block">
          <div className="font-semibold mb-1">{el.props.label || "Groupe"}</div>
          <div className="ml-2 inline-block">{renderPreview(el.children || [])}</div>
        </div>
      );
    return null;
  });
}

export default function LivePreview({ elements }: { elements: ElementData[] }) {
  return (
    <div className="p-4 border rounded bg-gray-50 dark:bg-gray-800 mb-4">
      <div className="font-bold mb-2">Aperçu en direct</div>
      <div>{renderPreview(elements)}</div>
    </div>
  );
}
