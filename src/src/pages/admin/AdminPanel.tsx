// src/pages/admin/AdminPanel.tsx
import { useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import UsersAdmin from "./UsersAdmin";
import ProjectsAdmin from "./ProjectsAdmin";
import LogsAdmin from "./LogsAdmin";
import ReplaysAdmin from "./ReplaysAdmin";
import MarketplaceManager from "../MarketplaceManager";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<
    "users" | "projects" | "logs" | "replays" | "marketplace"
  >("users");

  const tabs = [
    { id: "users", label: "👤 Utilisateurs" },
    { id: "projects", label: "📂 Projets" },
    { id: "logs", label: "📜 Logs" },
    { id: "replays", label: "🎥 Replays" },
    { id: "marketplace", label: "🛒 Marketplace" },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar Admin */}
        <aside className="w-64 bg-slate-100 dark:bg-slate-800 border-r dark:border-slate-700 p-4 space-y-3">
          <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">
            ⚙️ Admin Panel
          </h2>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-3 py-2 rounded transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Zone de contenu */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === "users" && <UsersAdmin />}
          {activeTab === "projects" && <ProjectsAdmin />}
          {activeTab === "logs" && <LogsAdmin />}
          {activeTab === "replays" && <ReplaysAdmin />}
          {activeTab === "marketplace" && <MarketplaceManager />}
        </main>
      </div>
    </DashboardLayout>
  );
}
