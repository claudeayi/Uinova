import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const provider = searchParams.get("provider"); // stripe | paypal | cinetpay
  const sessionId = searchParams.get("session_id") || searchParams.get("orderId");

  useEffect(() => {
    async function confirmPayment() {
      if (!provider || !sessionId) return;
      try {
        await axios.post(`/api/payments/${provider}/confirm`, { sessionId });
        toast.success("✅ Paiement confirmé ! Votre abonnement est actif.");
      } catch (err) {
        console.error("❌ Confirmation error:", err);
        toast.error("Impossible de confirmer le paiement.");
      }
    }
    confirmPayment();
  }, [provider, sessionId]);

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
      <h1 className="text-3xl font-bold text-green-600">🎉 Paiement réussi</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Merci pour votre confiance ! Votre plan premium est maintenant actif.
      </p>
      <Link
        to="/dashboard"
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Aller au Dashboard
      </Link>
    </div>
  );
}
