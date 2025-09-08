// src/pages/PaymentPendingPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import axios from "axios";

export default function PaymentPendingPage() {
  const [countdown, setCountdown] = useState(60); // 60s auto-refresh
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function refreshPaymentStatus() {
    try {
      setLoading(true);
      // ⚠️ Exemple → adapte à ton API backend
      const res = await axios.get("/api/payments/status");
      if (res.data?.status === "SUCCEEDED") {
        toast.success("✅ Paiement confirmé !");
        window.location.href = "/dashboard"; // redirection auto
      } else if (res.data?.status === "FAILED") {
        toast.error("❌ Paiement échoué. Contactez le support.");
        window.location.href = "/support";
      } else {
        toast("⏳ Paiement toujours en attente...");
        setCountdown(60);
      }
    } catch (err) {
      console.error("❌ Erreur vérification paiement:", err);
      toast.error("Impossible de vérifier l’état du paiement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (countdown === 0) refreshPaymentStatus();
  }, [countdown]);

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
        <h1 className="text-3xl font-bold text-indigo-600">
          ⏳ Paiement en cours
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          Votre transaction est en attente de confirmation par le fournisseur
          (banque, opérateur mobile ou plateforme). Cela peut prendre quelques
          minutes.
        </p>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vérification automatique dans{" "}
            <span className="font-semibold text-indigo-600">{countdown}s</span>
          </p>
          <Button
            onClick={refreshPaymentStatus}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Rafraîchir maintenant
          </Button>
        </div>

        <div className="flex gap-4 mt-6">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow transition"
          >
            🏠 Retour au Dashboard
          </Link>
          <Link
            to="/support"
            className="px-6 py-3 bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"
          >
            ❔ Contacter le support
          </Link>
        </div>

        {/* Avertissement si attente trop longue */}
        {countdown === 0 && (
          <div className="flex items-center gap-2 text-red-600 mt-4 text-sm">
            <AlertCircle className="w-4 h-4" />
            Cela prend plus de temps que prévu. Vérifiez votre transaction ou
            contactez le support.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
