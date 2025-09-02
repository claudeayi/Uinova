import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "react-hot-toast";

interface Stats {
  users: number;
  projects: number;
  payments: number;
  emailTemplates: number;
}

export default function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/stats", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setStats(res.data.data || res.data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de charger les stats.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
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
      <h1 className="text-2xl font-bold text-gray-800">⚙️ Cockpit Admin</h1>

      {/* Widgets stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Utilisateurs</p>
              <h2 className="text-2xl font-bold">{stats.users}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Projets</p>
              <h2 className="text-2xl font-bold">{stats.projects}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Paiements</p>
              <h2 className="text-2xl font-bold">{stats.payments}</h2>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Templates Email</p>
              <h2 className="text-2xl font-bold">{stats.emailTemplates}</h2>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liens rapides */}
      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">📂 Sections Admin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/users")}
            >
              👥 Utilisateurs
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/projects")}
            >
              📁 Projets
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/marketplace")}
            >
              🛒 Marketplace
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/webhooks")}
            >
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
            <Button
              variant="outline"
              onClick={() => navigate("/admin/usage")}
            >
              📊 Usage & Facturation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
