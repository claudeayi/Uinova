// src/pages/PaymentPage.tsx
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

/* ===============================
   Plans Pricing
=============================== */
const PLAN_PRICES: Record<
  string,
  { stripe: number; paypal: number; cinetpay: number; label: string; features: string[] }
> = {
  PRO: {
    stripe: 999,
    paypal: 9.99,
    cinetpay: 9.99,
    label: "Premium",
    features: [
      "✔️ Projets illimités",
      "✔️ Assistant IA intégré",
      "✔️ Export HTML, React & Flutter",
      "✔️ Marketplace complète",
    ],
  },
  BUSINESS: {
    stripe: 2999,
    paypal: 29.99,
    cinetpay: 29.99,
    label: "Business",
    features: [
      "✔️ Collaboration en temps réel",
      "✔️ Monitoring & Analytics",
      "✔️ Déploiements auto",
      "✔️ Branding personnalisé",
    ],
  },
  ENTERPRISE: {
    stripe: 9999,
    paypal: 99.99,
    cinetpay: 99.99,
    label: "Enterprise",
    features: [
      "✔️ Infra dédiée",
      "✔️ SLA & support 24/7",
      "✔️ Formation & onboarding",
      "✔️ Intégrations sur mesure",
    ],
  },
};

/* ===============================
   Payment Page
=============================== */
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
        toast.success("✅ Redirection vers la page de paiement...");
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
    <DashboardLayout>
      <div className="py-10 px-6 max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">💳 Paiement sécurisé</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Vous avez choisi le plan{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {prices.label}
            </span>
            . Sélectionnez un moyen de paiement pour continuer.
          </p>
        </div>

        {/* Récap Plan */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow space-y-3 relative">
          {plan === "PRO" && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs rounded-full bg-blue-600 text-white font-semibold shadow">
              ⭐ Populaire
            </span>
          )}
          <h2 className="text-xl font-semibold">📦 {prices.label}</h2>
          <p className="text-2xl font-bold">
            {plan === "ENTERPRISE"
              ? "Sur devis"
              : `${(prices.stripe / 100).toFixed(2)} € / mois`}
          </p>
          <ul className="text-sm space-y-1 mt-2">
            {prices.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        {/* Choix Paiement */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Stripe */}
          <button
            onClick={() => handlePayment("stripe")}
            disabled={loading === "stripe"}
            className="p-6 rounded-xl bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 disabled:opacity-50 flex flex-col items-center"
          >
            {loading === "stripe" ? (
              <span className="animate-pulse">⏳ Stripe...</span>
            ) : (
              <>
                💳 Payer avec Stripe
                <span className="text-xs mt-2">
                  {(prices.stripe / 100).toFixed(2)} €
                </span>
              </>
            )}
          </button>

          {/* PayPal */}
          <button
            onClick={() => handlePayment("paypal")}
            disabled={loading === "paypal"}
            className="p-6 rounded-xl bg-yellow-500 text-white font-semibold shadow hover:bg-yellow-600 disabled:opacity-50 flex flex-col items-center"
          >
            {loading === "paypal" ? (
              <span className="animate-pulse">⏳ PayPal...</span>
            ) : (
              <>
                🅿️ Payer avec PayPal
                <span className="text-xs mt-2">
                  {prices.paypal.toFixed(2)} €
                </span>
              </>
            )}
          </button>

          {/* CinetPay */}
          <button
            onClick={() => handlePayment("cinetpay")}
            disabled={loading === "cinetpay"}
            className="p-6 rounded-xl bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 disabled:opacity-50 flex flex-col items-center"
          >
            {loading === "cinetpay" ? (
              <span className="animate-pulse">⏳ Mobile Money...</span>
            ) : (
              <>
                📱 Orange / MTN Money
                <span className="text-xs mt-2">
                  {prices.cinetpay.toFixed(2)} XAF
                </span>
              </>
            )}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          🔒 Tous les paiements sont sécurisés via <strong>Stripe</strong>,{" "}
          <strong>PayPal</strong> et <strong>CinetPay</strong>. <br />
          En validant, vous acceptez nos{" "}
          <a href="/terms" className="underline">
            conditions d’utilisation
          </a>{" "}
          et notre{" "}
          <a href="/privacy" className="underline">
            politique de confidentialité
          </a>
          .
        </p>
      </div>
    </DashboardLayout>
  );
}
