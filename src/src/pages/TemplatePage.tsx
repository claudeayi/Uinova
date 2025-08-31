// src/pages/TemplatePage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMarketplaceItem, purchaseItem } from "@/services/marketplace";
import { useProject } from "@/context/ProjectContext";
import toast from "react-hot-toast";

interface Item {
  id: string;
  title: string;
  description?: string;
  previewUrl?: string;
  type?: string;
  priceCents?: number;
  currency?: string;
  createdAt: string;
  owner?: { email: string };
}

export default function TemplatePage() {
  const { id } = useParams();
  const { projectId } = useProject();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [favorite, setFavorite] = useState(false);

  // Charger le template
  useEffect(() => {
    async function fetchItem() {
      try {
        const res = await getMarketplaceItem(id!);
        setItem(res);
      } catch (err) {
        console.error("❌ Erreur chargement template:", err);
        toast.error("Impossible de charger ce template.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchItem();
  }, [id]);

  // Achat / Installation
  async function handlePurchase() {
    if (!projectId) {
      toast.error("⚠️ Sélectionnez d’abord un projet actif dans la liste.");
      return;
    }
    try {
      setPurchasing(true);
      const res = await purchaseItem(id!);
      toast.success(
        item?.priceCents
          ? "✅ Achat réussi ! Template ajouté à votre projet."
          : "✅ Template installé dans votre projet."
      );
      console.log("Résultat achat:", res);
    } catch (err) {
      console.error("❌ Erreur achat:", err);
      toast.error("Impossible de finaliser l’opération.");
    } finally {
      setPurchasing(false);
    }
  }

  // Favoris local (mock)
  function toggleFavorite() {
    setFavorite((f) => !f);
    toast.success(
      !favorite ? "⭐ Ajouté aux favoris !" : "❌ Retiré des favoris."
    );
  }

  if (loading)
    return <p className="text-gray-500 text-center mt-10">⏳ Chargement...</p>;
  if (!item)
    return (
      <p className="text-red-500 text-center mt-10">
        ❌ Template introuvable
      </p>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <h1 className="text-3xl font-bold">{item.title}</h1>
      <p className="text-gray-600 dark:text-gray-300">{item.description}</p>

      {/* Aperçu image */}
      {item.previewUrl && (
        <img
          src={item.previewUrl}
          alt={item.title}
          className="w-full rounded-lg shadow border"
        />
      )}

      {/* Infos template */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow space-y-2">
        <p>
          <span className="font-semibold">Type :</span>{" "}
          {item.type || "Template"}
        </p>
        <p>
          <span className="font-semibold">Prix :</span>{" "}
          {item.priceCents
            ? `${(item.priceCents / 100).toFixed(2)} ${
                item.currency || "EUR"
              }`
            : "Gratuit"}
        </p>
        <p>
          <span className="font-semibold">Vendeur :</span>{" "}
          {item.owner?.email || "Anonyme"}
        </p>
        <p>
          <span className="font-semibold">Créé le :</span>{" "}
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {purchasing
            ? "⏳ En cours..."
            : item.priceCents
            ? "🛒 Acheter & Installer"
            : "📥 Installer gratuitement"}
        </button>

        <button
          onClick={toggleFavorite}
          className={`px-4 py-2 rounded ${
            favorite
              ? "bg-yellow-400 text-black hover:bg-yellow-500"
              : "bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600"
          }`}
        >
          {favorite ? "⭐ Favori" : "☆ Ajouter aux favoris"}
        </button>
      </div>
    </div>
  );
}
