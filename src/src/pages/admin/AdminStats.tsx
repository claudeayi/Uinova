// src/pages/admin/AdminStats.tsx
import { useEffect, useState } from "react";
import { getAdminStats, AdminStats } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import { toast } from "react-hot-toast";
import {
  Users,
  FolderKanban,
  CreditCard,
  Mail,
  ShoppingBag,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error("❌ Erreur chargement stats:", err);
      toast.error("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-gray-500">⏳ Chargement des statistiques...</p>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <p className="p-6 text-red-500">❌ Aucune donnée disponible</p>
      </DashboardLayout>
    );
  }

  const pieData = [
    { name: "Utilisateurs", value: stats.users },
    { name: "Projets", value: stats.projects },
    { name: "Paiements", value: stats.payments },
    { name: "Templates Email", value: stats.emailTemplates },
    { name: "Marketplace", value: stats.marketplaceItems || 0 },
  ];

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">📊 Statistiques globales</h1>

        {/* Cartes rapides */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<Users className="w-6 h-6 text-indigo-600" />}
            label="Utilisateurs"
            value={stats.users}
          />
          <StatCard
            icon={<FolderKanban className="w-6 h-6 text-green-600" />}
            label="Projets"
            value={stats.projects}
          />
          <StatCard
            icon={<CreditCard className="w-6 h-6 text-yellow-600" />}
            label="Paiements"
            value={stats.payments}
          />
          <StatCard
            icon={<Mail className="w-6 h-6 text-red-600" />}
            label="Templates Email"
            value={stats.emailTemplates}
          />
          <StatCard
            icon={<ShoppingBag className="w-6 h-6 text-purple-600" />}
            label="Marketplace"
            value={stats.marketplaceItems || 0}
          />
        </div>

        {/* Graphe Pie */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Répartition globale</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* ===============================
   Sub-component
=============================== */
function StatCard({
  icon,
  label,
  value,
}: {
  icon: JSX.Element;
  label: string;
  value: number;
}) {
  return (
    <Card className="shadow-md rounded-2xl">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
          {icon}
        </div>
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
