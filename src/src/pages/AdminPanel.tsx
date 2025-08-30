import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AdminPanel() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">⚠️ Accès interdit</h1>
        <p className="mt-2 text-red-500">
          Vous devez être connecté avec un compte administrateur pour accéder à ce panneau.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* En-tête */}
      <header>
        <h1 className="text-3xl font-bold">⚙️ Panneau d’administration</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Bienvenue <strong>{user.email}</strong>, vous avez un contrôle complet sur la plateforme UInova.
          <br />
          Sélectionnez une section ci-dessous pour gérer et superviser.
        </p>
      </header>

      {/* Grille des sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Utilisateurs */}
        <Link
          to="/admin/users"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition border border-slate-200 dark:border-slate-700"
        >
          <h2 className="text-xl font-semibold mb-2">👤 Gestion Utilisateurs</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Voir et gérer les utilisateurs, leurs rôles, abonnements et permissions.
          </p>
        </Link>

        {/* Projets */}
        <Link
          to="/admin/projects"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition border border-slate-200 dark:border-slate-700"
        >
          <h2 className="text-xl font-semibold mb-2">📂 Gestion Projets</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Superviser les projets créés, vérifier l’avancement et résoudre les anomalies.
          </p>
        </Link>

        {/* Marketplace */}
        <Link
          to="/marketplace/manage"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition border border-slate-200 dark:border-slate-700"
        >
          <h2 className="text-xl font-semibold mb-2">🛒 Gestion Marketplace</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Ajouter, valider, modifier ou supprimer des templates et composants.
          </p>
        </Link>

        {/* Logs système */}
        <Link
          to="/admin/logs"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition border border-slate-200 dark:border-slate-700"
        >
          <h2 className="text-xl font-semibold mb-2">📜 Logs système</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Consulter les journaux système, activités critiques et erreurs.
          </p>
        </Link>

        {/* Monitoring */}
        <Link
          to="/monitoring"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition border border-slate-200 dark:border-slate-700"
        >
          <h2 className="text-xl font-semibold mb-2">📊 Monitoring</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Accéder au tableau de bord Prometheus & Grafana avec les métriques en temps réel.
          </p>
        </Link>

        {/* Replays collaboratifs */}
        <Link
          to="/admin/replays"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition border border-slate-200 dark:border-slate-700"
        >
          <h2 className="text-xl font-semibold mb-2">🎥 Replays Collaboratifs</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Examiner les replays des sessions de collaboration pour analyse et suivi.
          </p>
        </Link>
      </div>
    </div>
  );
}
