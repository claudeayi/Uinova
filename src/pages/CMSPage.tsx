import { useState } from "react";
import { useCMS } from "../store/useCMS";

/* ============================================================================
 * Types
 * ========================================================================== */
interface CMSItem {
  [key: string]: string;
}

interface Collection {
  id: string;
  name: string;
  fields: string[];
  items: CMSItem[];
}

/* ============================================================================
 * CMSPage – UInova v3 ultra-pro
 * ========================================================================== */
export default function CMSPage() {
  const {
    collections,
    selectedCollectionId,
    selectCollection,
    addCollection,
    updateCollection,
    removeCollection,
    addItem,
    updateItem,
    removeItem,
    clearItems,
  } = useCMS();

  const [newColName, setNewColName] = useState("");
  const [newColFields, setNewColFields] = useState("title,subtitle");
  const sel: Collection | undefined =
    collections.find((c) => c.id === selectedCollectionId) || collections[0];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">
        📚 UInova CMS
      </h1>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Collections */}
        <aside className="col-span-3">
          <h2 className="font-semibold mb-2">Collections</h2>
          <ul className="space-y-1">
            {collections.map((c) => (
              <li key={c.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedCollectionId === c.id
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => selectCollection(c.id)}
                  aria-label={`Sélectionner ${c.name}`}
                >
                  {c.name}{" "}
                  <span className="opacity-60">({c.items.length})</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Nouvelle collection */}
          <div className="mt-6 p-4 border rounded space-y-2 bg-slate-50 dark:bg-slate-900">
            <div className="font-semibold">➕ Nouvelle collection</div>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Nom"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
            />
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Champs (ex: title,subtitle,image)"
              value={newColFields}
              onChange={(e) => setNewColFields(e.target.value)}
            />
            <button
              className="w-full bg-indigo-600 text-white rounded px-3 py-2 hover:bg-indigo-700 transition"
              onClick={() => {
                if (!newColName.trim()) {
                  alert("⚠️ Nom requis pour créer une collection");
                  return;
                }
                const fields = newColFields
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                addCollection(newColName.trim(), fields);
                setNewColName("");
                setNewColFields("title,subtitle");
              }}
            >
              Créer
            </button>
          </div>
        </aside>

        {/* Main Items */}
        <main className="col-span-9">
          {sel ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">{sel.name}</div>
                <div className="space-x-2">
                  <button
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    onClick={() =>
                      updateCollection(sel.id, {
                        name:
                          prompt("Nouveau nom ?", sel.name) || sel.name,
                      })
                    }
                  >
                    ✏️ Renommer
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 transition"
                    onClick={() =>
                      window.confirm("Vider tous les items ?") &&
                      clearItems(sel.id)
                    }
                  >
                    🗑️ Vider items
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
                    onClick={() =>
                      window.confirm(
                        "Supprimer définitivement cette collection ?"
                      ) && removeCollection(sel.id)
                    }
                  >
                    ❌ Supprimer
                  </button>
                </div>
              </div>

              <div className="text-sm opacity-70 mb-3">
                Champs: {sel.fields.join(", ")}
              </div>

              {/* Items list */}
              <div className="space-y-3">
                {sel.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded flex items-start gap-3 bg-white dark:bg-slate-800 shadow-sm"
                  >
                    {sel.fields.map((f) => (
                      <div key={f} className="flex-1">
                        <div className="text-xs opacity-60 mb-1">{f}</div>
                        {f.toLowerCase().includes("image") ? (
                          <input
                            type="url"
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder="URL image"
                            value={it[f] ?? ""}
                            onChange={(e) =>
                              updateItem(sel.id, idx, { [f]: e.target.value })
                            }
                          />
                        ) : (
                          <input
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={it[f] ?? ""}
                            onChange={(e) =>
                              updateItem(sel.id, idx, { [f]: e.target.value })
                            }
                          />
                        )}
                      </div>
                    ))}
                    <button
                      className="px-3 py-1 rounded bg-red-600 text-white self-end hover:bg-red-700 transition"
                      onClick={() =>
                        window.confirm("Supprimer cet item ?") &&
                        removeItem(sel.id, idx)
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                ))}

                {sel.items.length === 0 && (
                  <p className="text-gray-400 italic text-sm">
                    Aucun item pour cette collection.
                  </p>
                )}
              </div>

              {/* Ajouter un item */}
              <button
                className="mt-4 px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
                onClick={() => {
                  const empty: CMSItem = {};
                  sel.fields.forEach((f) => (empty[f] = ""));
                  addItem(sel.id, empty);
                }}
              >
                ➕ Ajouter un item
              </button>
            </>
          ) : (
            <div className="text-gray-500 italic">
              Aucune collection sélectionnée.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
