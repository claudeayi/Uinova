// src/pages/SubscriptionPage.tsx
import { useEffect, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "react-hot-toast";

interface Subscription {
  id: string;
  plan: string;
  status: "ACTIVE" | "CANCELED" | "PENDING";
  renewAt: string | null;
  provider: "stripe" | "paypal" | "cinetpay";
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSubscription() {
    try {
      setLoading(true);
      const res = await axios.get("/api/subscriptions/me", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setSubscription(res.data);
    } catch (err) {
      console.error("❌ fetchSubscription error:", err);
      toast.error("Impossible de charger l’abonnement.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!subscription) return;
    if (!window.confirm("⚠️ Voulez-vous vraiment annuler votre abonnement ?")) return;
    try {
      await axios.post(`/api/subscriptions/${subscription.id}/cancel`, {});
      toast.success("✅ Abonnement annulé avec succès.");
      fetchSubscription();
    } catch (err) {
      console.error("❌ cancelSubscription error:", err);
      toast.error("Erreur lors de l’annulation.");
    }
  }

  useEffect(() => {
    fetchSubscription();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">📦 Mon abonnement</h1>

        {loading ? (
          <p className="text-gray-500">⏳ Chargement...</p>
        ) : subscription ? (
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-blue-600">
                Plan actuel : {subscription.plan}
              </h2>
              <p className="text-gray-600">
                Statut :{" "}
                <span
                  className={`font-semibold ${
                    subscription.status === "ACTIVE"
                      ? "text-green-600"
                      : subscription.status === "PENDING"
                      ? "text-orange-600"
                      : "text-red-600"
                  }`}
                >
                  {subscription.status}
                </span>
              </p>
              <p className="text-gray-600">
                Prochaine échéance :{" "}
                {subscription.renewAt
                  ? new Date(subscription.renewAt).toLocaleDateString("fr-FR")
                  : "—"}
              </p>
              <p className="text-gray-600">Paiement via : {subscription.provider}</p>

              <div className="flex gap-3 mt-4">
                {subscription.status === "ACTIVE" && (
                  <Button variant="destructive" onClick={handleCancel}>
                    ❌ Annuler l’abonnement
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/pricing")}
                >
                  🔄 Changer de plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Vous n’avez pas encore d’abonnement actif.</p>
              <Button
                className="mt-4"
                onClick={() => (window.location.href = "/pricing")}
              >
                💎 Voir les plans
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
