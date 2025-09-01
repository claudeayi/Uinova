// src/pages/TemplatePage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMarketplaceItem, purchaseItem } from "@/services/marketplace";
import { useProject } from "@/context/ProjectContext";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, ShoppingCart, Star } from "lucide-react";

/* ===============================
   Interfaces
=============================== */
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

/* ===============================
   Template Page
=============================== */
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

  /* ===============================
     Render
  =============================== */
  if (loading)
    return <p className="text-gray-500 text-center mt-10">⏳ Chargement...</p>;
  if (!item)
    return (
      <p className="text-red-500 text-center mt-10">
        ❌ Template introuvable
      </p>
    );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{item.title}</h1>
          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              favorite
                ? "bg-yellow-400 text-black hover:bg-yellow-500"
                : "bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600"
            }`}
          >
            <Star className="w-4 h-4" />
            {favorite ? "Favori" : "Ajouter aux favoris"}
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          {item.description || "Aucune description fournie."}
        </p>

        {/* Aperçu */}
        {item.previewUrl && (
          <div className="rounded-lg overflow-hidden shadow">
            <img
              src={item.previewUrl}
              alt={item.title}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Infos */}
        <Card>
          <CardContent className="space-y-2 p-4">
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
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            <ShoppingCart className="w-4 h-4" />
            {purchasing
              ? "⏳ En cours..."
              : item.priceCents
              ? "Acheter & Installer"
              : "Installer gratuitement"}
          </button>

          {item.previewUrl && (
            <a
              href={item.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Eye className="w-4 h-4" /> Preview live
            </a>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
