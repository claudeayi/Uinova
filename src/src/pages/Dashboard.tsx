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
} from "recharts";
import { getMyProjects } from "@/services/projects";
import { getUsage } from "@/services/billing";
import { Project } from "@/types/project";
import { UsageSummary } from "@/services/billing";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function fetchData() {
    try {
      setLoading(true);
      const [p, u] = await Promise.all([getMyProjects(), getUsage()]);
      setProjects(p || []);
      setUsage(u || null);
    } catch (err) {
      console.error("❌ Erreur chargement dashboard:", err);
      toast.error("Impossible de charger vos données.");
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
        <span className="ml-3">Chargement de votre dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        👋 Bienvenue sur votre Dashboard
      </h1>

      {/* 📊 Stats personnelles */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">📂 Projets</p>
              <h2 className="text-2xl font-bold">{usage.projects}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">⚡ Appels API</p>
              <h2 className="text-2xl font-bold">{usage.apiCalls}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">💾 Stockage</p>
              <h2 className="text-2xl font-bold">{usage.storage} MB</h2>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 📈 Graphique projets */}
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">📈 Évolution des projets</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={[
                { month: "Jan", projects: 1 },
                { month: "Fév", projects: 2 },
                { month: "Mar", projects: 3 },
                { month: "Avr", projects: 5 },
                { month: "Mai", projects: 8 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="projects" stroke="#6366f1" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 📝 Projets récents */}
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">📝 Vos projets récents</h2>
          {projects.length === 0 ? (
            <p className="text-gray-500">Vous n’avez pas encore de projet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {projects.slice(0, 5).map((p) => (
                <li
                  key={p.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-gray-500">
                      Créé le {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    Ouvrir →
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ⚡ Lien rapide */}
      <div className="text-right">
        <Button onClick={() => navigate("/projects/new")}>
          ➕ Nouveau projet
        </Button>
      </div>
    </div>
  );
}
