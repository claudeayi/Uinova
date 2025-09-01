// src/pages/PaymentPage.tsx
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

// ⚡ Mapping des montants par plan
const PLAN_PRICES: Record<string, { stripe: number; paypal: number; cinetpay: number }> = {
  PRO: { stripe: 999, paypal: 9.99, cinetpay: 9.99 },
  BUSINESS: { stripe: 2999, paypal: 29.99, cinetpay: 29.99 },
  ENTERPRISE: { stripe: 9999, paypal: 99.99, cinetpay: 99.99 },
};

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan")?.toUpperCase() || "PRO";
  const [loading, setLoading] = useState<string | null>(null);

  const prices = PLAN_PRICES[plan] || PLAN_PRICES.PRO;

  async function handlePayment(provider: "stripe" | "paypal" | "cinetpay") {
    try {
      setLoading(provider);
      let url = "";

      if (provider === "stripe") {
        const res = await axios.post("/api/payments/stripe", {
          amount: prices.stripe,
        });
        url = res.data?.checkoutUrl || "";
      } else if (provider === "paypal") {
        const res = await axios.post("/api/payments/paypal/create", {
          amount: prices.paypal,
        });
        url = res.data?.approveUrl || "";
      } else if (provider === "cinetpay") {
        const res = await axios.post("/api/payments/cinetpay/init", {
          amount: prices.cinetpay,
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
        Vous avez choisi le plan <span className="font-semibold">{plan}</span>.<br />
        Sélectionnez un moyen de paiement pour continuer.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Stripe */}
        <button
          onClick={() => handlePayment("stripe")}
          disabled={loading === "stripe"}
          className="p-6 rounded-xl bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 disabled:opacity-50 flex flex-col items-center"
        >
          {loading === "stripe" ? "⏳ Stripe..." : "💳 Payer avec Stripe"}
          <span className="text-xs mt-2">{(prices.stripe / 100).toFixed(2)} €</span>
        </button>

        {/* PayPal */}
        <button
          onClick={() => handlePayment("paypal")}
          disabled={loading === "paypal"}
          className="p-6 rounded-xl bg-yellow-500 text-white font-semibold shadow hover:bg-yellow-600 disabled:opacity-50 flex flex-col items-center"
        >
          {loading === "paypal" ? "⏳ PayPal..." : "🅿️ Payer avec PayPal"}
          <span className="text-xs mt-2">{prices.paypal.toFixed(2)} €</span>
        </button>

        {/* CinetPay (Mobile Money) */}
        <button
          onClick={() => handlePayment("cinetpay")}
          disabled={loading === "cinetpay"}
          className="p-6 rounded-xl bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 disabled:opacity-50 flex flex-col items-center"
        >
          {loading === "cinetpay" ? "⏳ Mobile Money..." : "📱 Orange / MTN Money"}
          <span className="text-xs mt-2">{prices.cinetpay.toFixed(2)} XAF</span>
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-400">
        🔒 Paiement sécurisé via <strong>Stripe</strong>, <strong>PayPal</strong> et <strong>CinetPay</strong>.
      </p>
    </div>
  );
}
