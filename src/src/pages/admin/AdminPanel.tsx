import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { getAdminStats, getAuditLogs, AdminStats, AuditLog } from "@/services/admin";

export default function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function fetchData() {
    try {
      setLoading(true);
      const [s, l] = await Promise.all([
        getAdminStats(),
        getAuditLogs({ limit: 5 }),
      ]);
      setStats(s);
      setLogs(l);
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de charger les données admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement du cockpit admin...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        ⚙️ Tableau de bord Admin
      </h1>

      {/* 📊 Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">👥 Utilisateurs</p>
              <h2 className="text-2xl font-bold">{stats.users}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">📂 Projets</p>
              <h2 className="text-2xl font-bold">{stats.projects}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">💳 Paiements</p>
              <h2 className="text-2xl font-bold">{stats.payments}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">📧 Templates Email</p>
              <h2 className="text-2xl font-bold">{stats.emailTemplates}</h2>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 📈 Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">📈 Croissance utilisateurs</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={[
                  { month: "Jan", value: 120 },
                  { month: "Fév", value: 180 },
                  { month: "Mar", value: 220 },
                  { month: "Avr", value: 310 },
                  { month: "Mai", value: 400 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#6366f1" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">📊 Projets créés par mois</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { month: "Jan", projects: 12 },
                  { month: "Fév", projects: 18 },
                  { month: "Mar", projects: 25 },
                  { month: "Avr", projects: 30 },
                  { month: "Mai", projects: 40 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="projects" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 📝 Logs récents */}
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">📝 Activité récente</h2>
          {logs.length === 0 ? (
            <p className="text-gray-500">Aucun log récent.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="p-2 rounded bg-gray-100 dark:bg-slate-800"
                >
                  <span className="font-medium">{l.user?.email || "—"}</span>{" "}
                  a effectué <span className="text-indigo-600">{l.action}</span>{" "}
                  le {new Date(l.createdAt).toLocaleString("fr-FR")}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 🔗 Liens rapides */}
      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">⚡ Liens rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => navigate("/admin/users")}>
              👥 Utilisateurs
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/projects")}>
              📂 Projets
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/payments")}>
              💳 Paiements
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/webhooks")}>
              🔗 Webhooks
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/email-templates")}
            >
              📧 Templates Email
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/organizations")}
            >
              🏢 Organisations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
