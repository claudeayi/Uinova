import { Link } from "react-router-dom";

export default function AdminPanel() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">⚙️ Panneau d’administration</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Bienvenue dans l’espace d’administration de UInova.
        <br />
        Sélectionnez une section ci-dessous pour gérer la plateforme.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Marketplace */}
        <Link
          to="/marketplace/manage"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">🛒 Gestion Marketplace</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Ajouter, modifier ou supprimer des templates et composants.
          </p>
        </Link>

        {/* Utilisateurs */}
        <Link
          to="/admin/users"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">👤 Gestion Utilisateurs</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Voir et gérer les utilisateurs, rôles et abonnements.
          </p>
        </Link>

        {/* Logs système */}
        <Link
          to="/admin/logs"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">📜 Logs système</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Consulter les journaux système et activités critiques.
          </p>
        </Link>

        {/* Monitoring */}
        <Link
          to="/monitoring"
          className="p-6 rounded-lg shadow bg-white dark:bg-slate-800 hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">📊 Monitoring</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Accéder au tableau de bord Prometheus & Grafana.
          </p>
        </Link>
      </div>
    </div>
  );
}
