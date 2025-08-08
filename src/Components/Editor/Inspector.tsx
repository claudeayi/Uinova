import { useMemo, useState } from "react";
import { useCMS } from "../../store/useCMS";

// Aligne-toi sur ton type ElementData du store si tu l'exportes.
// Ici, on redéfinit minimalement pour rendre ce composant autonome.
type ElementData = {
  id: string;
  type: string;
  props?: Record<string, any>;
  children?: ElementData[];
};

type Props = {
  elements: ElementData[];
};

export default function LivePreview({ elements }: Props) {
  const { getItems } = useCMS();
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");

  // Résout une valeur liée au CMS: prend le premier item de la collection.
  const resolveBinding = (props?: Record<string, any>) => {
    const b = props?._binding;
    if (!b?.collectionId || !b?.field) return null;
    const items = getItems(b.collectionId);
    if (!items.length) return null;
    return items[0]?.[b.field] ?? null;
  };

  // Construit un style inline à partir des props éditées dans l’Inspector
  const buildStyle = (props?: Record<string, any>): React.CSSProperties => {
    if (!props) return {};
    const s: React.CSSProperties = {};
    if (props.color) s.color = props.color;
    if (props.bg) s.background = props.bg;
    if (typeof props.fontSize === "number") s.fontSize = props.fontSize;
    if (typeof props.p === "number") s.padding = props.p;
    if (props.display) s.display = props.display as any;
    return s;
  };

  const frameStyle: React.CSSProperties = useMemo(() => {
    const width =
      device === "mobile" ? 375 :
      device === "tablet" ? 834 : // iPad-ish
      undefined; // desktop = plein container
    return {
      width,
      minHeight: 500,
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      background: "#ffffff",
      overflow: "hidden",
    };
  }, [device]);

  const renderEl = (el: ElementData): JSX.Element => {
    const props = el.props || {};
    const style = buildStyle(props);
    const bound = resolveBinding(props);

    if (el.type === "button") {
      const label = bound ?? props.label ?? "Button";
      return (
        <button
          style={style}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          {label}
        </button>
      );
    }

    if (el.type === "input") {
      const ph = bound ?? props.label ?? "Saisir…";
      return (
        <input
          style={style}
          className="border px-2 py-1 rounded"
          placeholder={ph}
          readOnly
        />
      );
    }

    if (el.type === "card") {
      const text = bound ?? props.label ?? "Card";
      return (
        <div
          style={style}
          className="p-2 bg-gray-100 dark:bg-gray-700 rounded"
        >
          {text}
        </div>
      );
    }

    if (el.type === "group") {
      return (
        <div style={style} className="p-2 border-2 border-dashed rounded">
          {props.label && (
            <div className="font-semibold mb-1">{props.label}</div>
          )}
          <div className="ml-2 space-y-1">
            {(el.children || []).map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-700 rounded p-2">
                {renderEl(c)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Fallback pour types non mappés (ou futurs composants)
    const fallback = bound ?? props.label ?? el.type;
    return (
      <div style={style}>{fallback}</div>
    );
  };

  return (
    <div className="mb-4">
      {/* Barre device */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm opacity-70 mr-2">Aperçu</span>
        <button
          className={`px-2 py-1 rounded ${device === "mobile" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
          onClick={() => setDevice("mobile")}
        >
          📱 Mobile
        </button>
        <button
          className={`px-2 py-1 rounded ${device === "tablet" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
          onClick={() => setDevice("tablet")}
        >
          💻 Tablet
        </button>
        <button
          className={`px-2 py-1 rounded ${device === "desktop" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
          onClick={() => setDevice("desktop")}
        >
          🖥️ Desktop
        </button>
      </div>

      {/* Zone de rendu */}
      <div
        className="mx-auto p-4 bg-white dark:bg-gray-800"
        style={frameStyle}
      >
        <div className="space-y-2">
          {elements.map((el) => (
            <div key={el.id}>{renderEl(el)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
