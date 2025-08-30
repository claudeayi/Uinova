import { useState } from "react";
import { deployProject } from "@/services/infra";

export default function DeployWizard({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDeploy() {
    setLoading(true);
    setStatus("⏳ Déploiement en cours...");
    try {
      const res = await deployProject(projectId);
      setStatus(`✅ Projet déployé à ${res.url}`);
    } catch (err) {
      setStatus("❌ Erreur de déploiement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg shadow space-y-4">
      <h2 className="text-lg font-bold">🚀 Déployer mon projet</h2>
      <button
        className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
        disabled={loading}
        onClick={handleDeploy}
      >
        {loading ? "Déploiement..." : "Déployer"}
      </button>
      <p>{status}</p>
    </div>
  );
}
