// src/pages/PaymentSuccessPage.tsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const provider = searchParams.get("provider"); // stripe | paypal | cinetpay
  const sessionId =
    searchParams.get("session_id") || searchParams.get("orderId");

  const [confirming, setConfirming] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    async function confirmPayment() {
      if (!provider || !sessionId) {
        setConfirming(false);
        return;
      }
      try {
        const res = await axios.post(`/api/payments/${provider}/confirm`, {
          sessionId,
        });
        if (res.data?.success) {
          toast.success("✅ Paiement confirmé ! Votre abonnement est actif.");
          setConfirmed(true);
        } else {
          toast.error("⚠️ Impossible de confirmer le paiement.");
        }
      } catch (err) {
        console.error("❌ Confirmation error:", err);
        toast.error("Erreur lors de la confirmation du paiement.");
      } finally {
        setConfirming(false);
      }
    }
    confirmPayment();
  }, [provider, sessionId]);

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
        {confirming ? (
          <>
            <div className="animate-spin h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full"></div>
            <p className="text-gray-600 dark:text-gray-300">
              Vérification de votre paiement en cours...
            </p>
          </>
        ) : confirmed ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h1 className="text-3xl font-bold text-green-600">
              🎉 Paiement réussi
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-md">
              Merci pour votre confiance ! Votre plan premium est maintenant
              actif. Vous pouvez accéder immédiatement à toutes les
              fonctionnalités.
            </p>
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow transition"
            >
              Aller au Dashboard
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-red-600">
              ❌ Paiement non confirmé
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-md">
              Une erreur est survenue lors de la confirmation du paiement. Vous
              pouvez réessayer ou contacter le support.
            </p>
            <div className="flex gap-4">
              <Link
                to="/pricing"
                className="px-6 py-2 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                Revenir aux tarifs
              </Link>
              <Link
                to="/support"
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Contacter le support
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
