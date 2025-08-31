// src/pages/PaymentPage.tsx
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "PRO";
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePayment(provider: "stripe" | "paypal" | "cinetpay") {
    try {
      setLoading(provider);
      let url = "";

      if (provider === "stripe") {
        const res = await axios.post("/api/payments/stripe", {
          amount: plan === "PRO" ? 999 : plan === "BUSINESS" ? 2999 : 0,
        });
        url = res.data?.checkoutUrl || "";
      } else if (provider === "paypal") {
        const res = await axios.post("/api/payments/paypal/create", {
          amount: plan === "PRO" ? 9.99 : plan === "BUSINESS" ? 29.99 : 0,
        });
        url = res.data?.approveUrl || "";
      } else if (provider === "cinetpay") {
        const res = await axios.post("/api/payments/cinetpay/init", {
          amount: plan === "PRO" ? 9.99 : plan === "BUSINESS" ? 29.99 : 0,
          currency: "XAF",
        });
        url = res.data?.paymentUrl || "";
      }

      if (url) {
        toast.success("✅ Redirection vers la page de paiement");
        window.location.href = url;
      } else {
        throw new Error("Lien de paiement introuvable");
      }
    } catch (err) {
      console.error("❌ Payment error:", err);
      toast.error("Échec du paiement. Réessayez.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="py-10 px-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">💳 Paiement</h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Vous avez choisi le plan <span className="font-semibold">{plan}</span>.
        Sélectionnez un moyen de paiement pour continuer.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Stripe */}
        <button
          onClick={() => handlePayment("stripe")}
          disabled={loading === "stripe"}
          className="p-6 rounded-xl bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 disabled:opacity-50"
        >
          {loading === "stripe" ? "⏳ Stripe..." : "💳 Payer avec Stripe"}
        </button>

        {/* PayPal */}
        <button
          onClick={() => handlePayment("paypal")}
          disabled={loading === "paypal"}
          className="p-6 rounded-xl bg-yellow-500 text-white font-semibold shadow hover:bg-yellow-600 disabled:opacity-50"
        >
          {loading === "paypal" ? "⏳ PayPal..." : "🅿️ Payer avec PayPal"}
        </button>

        {/* CinetPay (Mobile Money) */}
        <button
          onClick={() => handlePayment("cinetpay")}
          disabled={loading === "cinetpay"}
          className="p-6 rounded-xl bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 disabled:opacity-50"
        >
          {loading === "cinetpay" ? "⏳ Mobile Money..." : "📱 Orange / MTN Money"}
        </button>
      </div>
    </div>
  );
}
