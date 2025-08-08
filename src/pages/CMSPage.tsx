import { useState } from "react";
import { useCMS } from "../store/useCMS";

export default function CMSPage() {
  const {
    collections, selectedCollectionId, selectCollection,
    addCollection, updateCollection, removeCollection,
    addItem, updateItem, removeItem, clearItems
  } = useCMS();

  const [newColName, setNewColName] = useState("");
  const [newColFields, setNewColFields] = useState("title,subtitle");
  const sel = collections.find(c => c.id === selectedCollectionId) || collections[0];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">UInova CMS</h1>
      <div className="grid grid-cols-12 gap-6">
        {/* Collections */}
        <aside className="col-span-3">
          <h2 className="font-semibold mb-2">Collections</h2>
          <ul className="space-y-1">
            {collections.map(c => (
              <li key={c.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded ${selectedCollectionId === c.id ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                  onClick={() => selectCollection(c.id)}
                >
                  {c.name} <span className="opacity-60">({c.items.length})</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 p-3 border rounded space-y-2">
            <div className="font-semibold">Nouvelle collection</div>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Nom"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
            />
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Champs (ex: title,subtitle,image)"
              value={newColFields}
              onChange={(e) => setNewColFields(e.target.value)}
            />
            <button
              className="w-full bg-blue-600 text-white rounded px-3 py-2"
              onClick={() => {
                if (!newColName.trim()) return;
                const fields = newColFields.split(",").map(s => s.trim()).filter(Boolean);
                addCollection(newColName.trim(), fields);
                setNewColName("");
                setNewColFields("title,subtitle");
              }}
            >
              Ajouter
            </button>
          </div>
        </aside>

        {/* Items */}
        <main className="col-span-9">
          {sel ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold">{sel.name}</div>
                <div className="space-x-2">
                  <button
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
                    onClick={() => updateCollection(sel.id, { name: prompt("Nouveau nom ?", sel.name) || sel.name })}
                  >
                    Renommer
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-yellow-500 text-white"
                    onClick={() => clearItems(sel.id)}
                  >
                    Vider items
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-600 text-white"
                    onClick={() => removeCollection(sel.id)}
                  >
                    Supprimer collection
                  </button>
                </div>
              </div>

              <div className="text-sm opacity-70 mb-3">Champs: {sel.fields.join(", ")}</div>

              <div className="space-y-3">
                {sel.items.map((it, idx) => (
                  <div key={idx} className="p-3 border rounded flex items-start gap-3">
                    {sel.fields.map(f => (
                      <div key={f} className="flex-1">
                        <div className="text-xs opacity-60">{f}</div>
                        <input
                          className="w-full border rounded px-2 py-1"
                          value={it[f] ?? ""}
                          onChange={(e) => updateItem(sel.id, idx, { [f]: e.target.value })}
                        />
                      </div>
                    ))}
                    <button
                      className="px-3 py-1 rounded bg-red-600 text-white self-end"
                      onClick={() => removeItem(sel.id, idx)}
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="mt-4 px-4 py-2 rounded bg-blue-600 text-white"
                onClick={() => {
                  const empty: any = {};
                  sel.fields.forEach(f => (empty[f] = ""));
                  addItem(sel.id, empty);
                }}
              >
                + Ajouter un item
              </button>
            </>
          ) : (
            <div>Aucune collection sélectionnée.</div>
          )}
        </main>
      </div>
    </div>
  );
}
