// src/pages/MarketplaceManager.tsx
import { useEffect, useState } from "react";
import {
  getMarketplaceItems,
  publishItem,
  updateMarketplaceItem,
  deleteMarketplaceItem,
  MarketplaceItem,
} from "@/services/marketplace";
import toast from "react-hot-toast";

export default function MarketplaceManager() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priceCents: 0,
    type: "template",
    previewUrl: "",
    published: true,
  });

  async function loadItems() {
    try {
      setLoading(true);
      const res = await getMarketplaceItems();
      setItems(res);
    } catch (err) {
      console.error("❌ Erreur chargement items:", err);
      toast.error("Impossible de charger la marketplace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleSave() {
    try {
      if (editingItem) {
        await updateMarketplaceItem(editingItem.id, form);
        toast.success("✅ Item mis à jour");
      } else {
        await publishItem(form);
        toast.success("✅ Item publié");
      }
      resetForm();
      loadItems();
    } catch {
      toast.error("❌ Échec de l’opération");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet item ?")) return;
    try {
      await deleteMarketplaceItem(id);
      toast.success("✅ Item supprimé");
      loadItems();
    } catch {
      toast.error("❌ Erreur suppression");
    }
  }

  function resetForm() {
    setForm({
      title: "",
      description: "",
      priceCents: 0,
      type: "template",
      previewUrl: "",
      published: true,
    });
    setEditingItem(null);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Gestion Marketplace</h1>

      {/* Formulaire ajout/édition */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded shadow space-y-3">
        <h2 className="text-lg font-semibold">
          {editingItem ? "✏️ Modifier un item" : "➕ Ajouter un item"}
        </h2>

        <input
          type="text"
          placeholder="Titre"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full p-2 rounded border dark:bg-slate-900"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full p-2 rounded border dark:bg-slate-900"
        />
        <input
          type="number"
          placeholder="Prix en centimes (0 = gratuit)"
          value={form.priceCents}
          onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
          className="w-full p-2 rounded border dark:bg-slate-900"
        />
        <input
          type="url"
          placeholder="URL d’aperçu (image)"
          value={form.previewUrl}
          onChange={(e) => setForm({ ...form, previewUrl: e.target.value })}
          className="w-full p-2 rounded border dark:bg-slate-900"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="w-full p-2 rounded border dark:bg-slate-900"
        >
          <option value="template">Template</option>
          <option value="component">Component</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Publier immédiatement
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {editingItem ? "💾 Sauvegarder" : "📤 Publier"}
          </button>
          {editingItem && (
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ❌ Annuler
            </button>
          )}
        </div>
      </div>

      {/* Liste des items */}
      {loading ? (
        <p>⏳ Chargement...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Aucun item marketplace.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="p-2 border">Aperçu</th>
                <th className="p-2 border">Titre</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Prix</th>
                <th className="p-2 border">Statut</th>
                <th className="p-2 border">Auteur</th>
                <th className="p-2 border">Créé le</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t dark:border-slate-700">
                  <td className="p-2">
                    {i.previewUrl ? (
                      <img
                        src={i.previewUrl}
                        alt={i.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2">{i.title}</td>
                  <td className="p-2 capitalize">{i.type}</td>
                  <td className="p-2">
                    {i.priceCents ? (i.priceCents / 100).toFixed(2) + " €" : "Gratuit"}
                  </td>
                  <td className="p-2">
                    {i.published ? "✅ Publié" : "⏳ Brouillon"}
                  </td>
                  <td className="p-2">{i.owner?.email || "—"}</td>
                  <td className="p-2">
                    {new Date(i.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(i);
                        setForm({
                          title: i.title,
                          description: i.description || "",
                          priceCents: i.priceCents || 0,
                          type: i.type,
                          previewUrl: i.previewUrl || "",
                          published: i.published ?? true,
                        });
                      }}
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(i.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
