import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMarketplaceItem, purchaseItem } from "@/services/marketplace";
import { useProject } from "@/context/ProjectContext";
import toast from "react-hot-toast";

export default function TemplatePage() {
  const { id } = useParams();
  const { projectId } = useProject();
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

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

  async function handlePurchase() {
    if (!projectId) {
      toast.error("⚠️ Sélectionnez d’abord un projet actif !");
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

  if (loading) return <p className="text-gray-500">⏳ Chargement...</p>;
  if (!item) return <p className="text-red-500">❌ Template introuvable</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{item.title}</h1>
      <p className="text-gray-600 dark:text-gray-300">{item.description}</p>

      {/* Aperçu image */}
      {item.previewUrl && (
        <img
          src={item.previewUrl}
          alt={item.title}
          className="w-full rounded-lg shadow"
        />
      )}

      {/* Infos template */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow space-y-2">
        <p>
          <span className="font-semibold">Type :</span> {item.type}
        </p>
        <p>
          <span className="font-semibold">Prix :</span>{" "}
          {item.priceCents
            ? (item.priceCents / 100).toFixed(2) + " €"
            : "Gratuit"}
        </p>
        <p>
          <span className="font-semibold">Créé le :</span>{" "}
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Bouton achat/installation */}
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
    </div>
  );
}
