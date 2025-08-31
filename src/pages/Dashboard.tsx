// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getMyProjects } from "@/services/projects";
import { listNotifications } from "@/services/notifications";
import { listBadges } from "@/services/badges";

interface Project {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Badge {
  id: string;
  type: string;
  earnedAt: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [projRes, notifRes, badgeRes] = await Promise.all([
        getMyProjects(),
        listNotifications({ unreadOnly: true, pageSize: 5 }),
        listBadges({ pageSize: 5 }),
      ]);
      setProjects(projRes.data || []);
      setNotifications(notifRes.items || []);
      setBadges(badgeRes.items || []);
    } catch (err) {
      console.error("❌ Dashboard load error:", err);
      toast.error("Impossible de charger le tableau de bord");
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold">🚀 Bienvenue sur UInova</h1>
        <p className="text-sm opacity-80">
          Créez, déployez et partagez vos projets no-code nouvelle génération.
        </p>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/projects"
          className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow hover:shadow-lg transition"
        >
          📁 <h3 className="font-semibold mt-2">Mes projets</h3>
        </Link>
        <Link
          to="/marketplace"
          className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow hover:shadow-lg transition"
        >
          🛒 <h3 className="font-semibold mt-2">Marketplace</h3>
        </Link>
        <Link
          to="/ai"
          className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow hover:shadow-lg transition"
        >
          🤖 <h3 className="font-semibold mt-2">Copilot IA</h3>
        </Link>
        <Link
          to="/monitoring"
          className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow hover:shadow-lg transition"
        >
          📊 <h3 className="font-semibold mt-2">Monitoring</h3>
        </Link>
      </div>

      {/* MES PROJETS */}
      <section className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-3">📁 Mes projets récents</h2>
        {projects.length === 0 ? (
          <p className="text-gray-500">Aucun projet pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-slate-700">
            {projects.map((p) => (
              <li key={p.id} className="py-2 flex justify-between">
                <Link
                  to={`/editor/${p.id}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {p.name}
                </Link>
                <span className="text-sm text-gray-500">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* NOTIFICATIONS */}
      <section className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-3">🔔 Dernières notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-gray-500">Aucune notification récente.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="text-sm">
                <span className="font-semibold">{n.title}</span> — {n.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* BADGES */}
      <section className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-3">🏆 Mes badges</h2>
        {badges.length === 0 ? (
          <p className="text-gray-500">Aucun badge pour l’instant.</p>
        ) : (
          <div className="flex gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs font-semibold"
              >
                {b.type}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
