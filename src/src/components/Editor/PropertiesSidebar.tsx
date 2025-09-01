import { useState, useEffect } from "react";

interface PropertiesSidebarProps {
  component: any;
  onUpdate: (id: string, props: Record<string, any>) => void;
}

export default function PropertiesSidebar({ component, onUpdate }: PropertiesSidebarProps) {
  const [localProps, setLocalProps] = useState<Record<string, any>>(component?.props || {});

  useEffect(() => {
    setLocalProps(component?.props || {});
  }, [component]);

  if (!component) {
    return (
      <div className="w-72 border-l dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-gray-400">
        Sélectionnez un composant pour éditer ses propriétés
      </div>
    );
  }

  function handleChange(key: string, value: string) {
    const updated = { ...localProps, [key]: value };
    setLocalProps(updated);
    onUpdate(component.id, updated);
  }

  return (
    <div className="w-72 border-l dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
      <h3 className="font-semibold mb-2">⚙️ Propriétés</h3>
      <p className="text-xs text-gray-500 mb-3">Édition de : <strong>{component.type}</strong></p>

      {component.type === "Bouton" && (
        <>
          <label className="block text-sm">Texte</label>
          <input
            type="text"
            value={localProps.text || ""}
            onChange={(e) => handleChange("text", e.target.value)}
            className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
          />
          <label className="block text-sm">Couleur</label>
          <input
            type="color"
            value={localProps.color || "#6366f1"}
            onChange={(e) => handleChange("color", e.target.value)}
            className="w-12 h-8 p-0 border rounded"
          />
        </>
      )}

      {component.type === "Texte" && (
        <>
          <label className="block text-sm">Contenu</label>
          <textarea
            value={localProps.text || ""}
            onChange={(e) => handleChange("text", e.target.value)}
            className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
          />
        </>
      )}

      {component.type === "Image" && (
        <>
          <label className="block text-sm">URL de l’image</label>
          <input
            type="text"
            value={localProps.src || ""}
            onChange={(e) => handleChange("src", e.target.value)}
            className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
          />
          <label className="block text-sm">Largeur (%)</label>
          <input
            type="number"
            value={localProps.width || 100}
            onChange={(e) => handleChange("width", e.target.value)}
            className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
          />
        </>
      )}

      {component.type === "Formulaire" && (
        <>
          <label className="block text-sm">Bouton</label>
          <input
            type="text"
            value={localProps.buttonText || "Envoyer"}
            onChange={(e) => handleChange("buttonText", e.target.value)}
            className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
          />
        </>
      )}
    </div>
  );
}
