import { useState } from "react";
import { generateProject } from "@/services/ai";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function AIBuilderPage() {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState("react");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Merci de saisir une description !");
      return;
    }

    try {
      setLoading(true);
      const project = await generateProject(prompt, framework);
      toast.success("🎉 Projet généré avec succès !");
      
      // ⚡ Redirection directe vers l’éditeur avec le nouvel ID
      navigate(`/editor/${project.id}`);
    } catch (err) {
      console.error("❌ handleGenerate error:", err);
      toast.error("Erreur lors de la génération du projet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        🚀 Assistant IA – Crée ton projet avec UInova
      </h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ex: Crée-moi un site e-commerce avec catalogue produits, panier et paiement Stripe."
        className="w-full p-4 border rounded-lg mb-4 dark:bg-slate-800 dark:border-slate-700"
        rows={5}
      />

      <div className="flex items-center space-x-4 mb-6">
        <label className="text-sm font-medium">Framework cible :</label>
        <select
          value={framework}
          onChange={(e) => setFramework(e.target.value)}
          className="px-3 py-2 rounded border dark:bg-slate-800 dark:border-slate-700"
        >
          <option value="react">⚛️ React</option>
          <option value="flutter">📱 Flutter</option>
          <option value="pwa">🌐 PWA</option>
          <option value="html">📄 HTML</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "⏳ Génération..." : "✨ Générer le projet"}
      </button>
    </div>
  );
}
