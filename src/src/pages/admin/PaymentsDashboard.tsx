import { useEffect, useState } from "react";
import { getAdminPayments, AdminPayment } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import { toast } from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ============================================================================
 *  PaymentsDashboard – Analytics pour la facturation
 * ========================================================================== */
export default function PaymentsDashboard() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPayments() {
    try {
      setLoading(true);
      const data = await getAdminPayments();
      setPayments(data || []);
    } catch (err) {
      console.error("❌ Erreur chargement paiements:", err);
      toast.error("Impossible de charger les paiements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-gray-500">⏳ Chargement analytics paiements...</p>
      </DashboardLayout>
    );
  }

  /* ============================================================================
   *  Données agrégées
   * ========================================================================== */
  const succeeded = payments.filter((p) => p.status === "SUCCEEDED");
  const failed = payments.filter((p) => p.status === "FAILED");

  // Revenus par mois
  const monthlyRevenue = succeeded.reduce((acc, p) => {
    const month = new Date(p.createdAt).toLocaleString("fr-FR", {
      month: "short",
      year: "2-digit",
    });
    acc[month] = (acc[month] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);
  const revenueData = Object.entries(monthlyRevenue).map(([month, total]) => ({
    month,
    total,
  }));

  // Répartition providers
  const providerCounts = payments.reduce((acc, p) => {
    acc[p.provider] = (acc[p.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const providerData = Object.entries(providerCounts).map(([provider, count]) => ({
    name: provider,
    value: count,
  }));
  const COLORS = ["#6366f1", "#f59e0b", "#dc2626", "#10b981"];

  // Taux de succès par mois
  const successRateData = (() => {
    const stats: Record<
      string,
      { success: number; total: number }
    > = {};
    payments.forEach((p) => {
      const month = new Date(p.createdAt).toLocaleString("fr-FR", {
        month: "short",
        year: "2-digit",
      });
      if (!stats[month]) stats[month] = { success: 0, total: 0 };
      stats[month].total++;
      if (p.status === "SUCCEEDED") stats[month].success++;
    });
    return Object.entries(stats).map(([month, { success, total }]) => ({
      month,
      rate: total > 0 ? Math.round((success / total) * 100) : 0,
    }));
  })();

  /* ============================================================================
   *  Render
   * ========================================================================== */
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">📊 Analytics Paiements</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-sm">Total paiements</p>
              <h2 className="text-2xl font-bold">{payments.length}</h2>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-sm">Réussis</p>
              <h2 className="text-2xl font-bold text-green-600">
                {succeeded.length}
              </h2>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-sm">Échoués</p>
              <h2 className="text-2xl font-bold text-red-600">
                {failed.length}
              </h2>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-sm">Revenus totaux</p>
              <h2 className="text-2xl font-bold text-indigo-600">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(
                  succeeded.reduce((acc, p) => acc + p.amount, 0) / 100
                )}
              </h2>
            </CardContent>
          </Card>
        </div>

        {/* Revenus par mois */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">📅 Revenus par mois</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition Providers */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">🔗 Répartition par provider</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={providerData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {providerData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Taux de succès */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">📈 Taux de succès (%)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={successRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
