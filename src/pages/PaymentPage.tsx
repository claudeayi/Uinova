// src/pages/PaymentPage.tsx
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Loader2, ShieldCheck, CreditCard, Smartphone, Wallet, Ticket } from "lucide-react";

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
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [couponStatus, setCouponStatus] = useState<"idle" | "valid" | "invalid">("idle");

  const prices = PLAN_PRICES[plan] || PLAN_PRICES.PRO;

  const finalStripe = Math.max(0, prices.stripe - discount);
  const finalPaypal = Math.max(0, prices.paypal - discount / 100);
  const finalCinetpay = Math.max(0, prices.cinetpay - discount / 100);

  async function handleValidateCoupon() {
    if (!coupon.trim()) return;
    try {
      const res = await axios.post("/api/payments/validate-coupon", {
        code: coupon.trim(),
        plan,
      });
      if (res.data?.valid) {
        const value = res.data.amountOff ?? res.data.percentOff * prices.stripe / 100;
        setDiscount(value);
        setCouponStatus("valid");
        toast.success(`🎟️ Coupon appliqué : -${value / 100} €`);
      } else {
        setCouponStatus("invalid");
        setDiscount(0);
        toast.error("❌ Coupon invalide ou expiré.");
      }
    } catch (err) {
      console.error("❌ Coupon error:", err);
      setCouponStatus("invalid");
      toast.error("Erreur lors de la validation du coupon.");
    }
  }

  async function handlePayment(provider: "stripe" | "paypal" | "cinetpay") {
    try {
      setLoading(provider);
      let url = "";

      if (provider === "stripe") {
        const res = await axios.post("/api/payments/stripe", {
          amount: finalStripe,
          coupon,
        });
        url = res.data?.checkoutUrl || "";
      } else if (provider === "paypal") {
        const res = await axios.post("/api/payments/paypal/create", {
          amount: finalPaypal,
          coupon,
        });
        url = res.data?.approveUrl || "";
      } else if (provider === "cinetpay") {
        const res = await axios.post("/api/payments/cinetpay/init", {
          amount: finalCinetpay,
          currency: "XAF",
          coupon,
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
        <div className="text-center space-y-2">
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
              : `${(finalStripe / 100).toFixed(2)} € / mois`}
          </p>
          <ul className="text-sm space-y-1 mt-2">
            {prices.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>

          {/* Coupon */}
          <div className="mt-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-500" />
            <input
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Code promo"
              className="flex-1 px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
            />
            <button
              onClick={handleValidateCoupon}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Appliquer
            </button>
          </div>
          {couponStatus === "valid" && (
            <p className="text-green-600 text-sm">✅ Coupon appliqué</p>
          )}
          {couponStatus === "invalid" && (
            <p className="text-red-600 text-sm">❌ Coupon invalide</p>
          )}
        </div>

        {/* Choix Paiement */}
        <div className="grid md:grid-cols-3 gap-6">
          <PaymentButton
            provider="stripe"
            label="Payer avec Stripe"
            sub={`${(finalStripe / 100).toFixed(2)} €`}
            icon={<CreditCard className="w-5 h-5" />}
            color="bg-purple-600 hover:bg-purple-700"
            loading={loading}
            onClick={() => handlePayment("stripe")}
          />

          <PaymentButton
            provider="paypal"
            label="Payer avec PayPal"
            sub={`${finalPaypal.toFixed(2)} €`}
            icon={<Wallet className="w-5 h-5" />}
            color="bg-yellow-500 hover:bg-yellow-600"
            loading={loading}
            onClick={() => handlePayment("paypal")}
          />

          <PaymentButton
            provider="cinetpay"
            label="Orange / MTN Money"
            sub={`${finalCinetpay.toFixed(2)} XAF`}
            icon={<Smartphone className="w-5 h-5" />}
            color="bg-orange-600 hover:bg-orange-700"
            loading={loading}
            onClick={() => handlePayment("cinetpay")}
          />
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-400 space-y-2">
          <p className="flex justify-center items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Tous les paiements sont sécurisés
            via <strong>Stripe</strong>, <strong>PayPal</strong> et{" "}
            <strong>CinetPay</strong>.
          </p>
          <p>
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
      </div>
    </DashboardLayout>
  );
}

/* ============================================================================
 * PaymentButton – Bouton réutilisable
 * ========================================================================== */
function PaymentButton({
  provider,
  label,
  sub,
  icon,
  color,
  loading,
  onClick,
}: {
  provider: string;
  label: string;
  sub: string;
  icon: JSX.Element;
  color: string;
  loading: string | null;
  onClick: () => void;
}) {
  const isLoading = loading === provider;
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      aria-label={label}
      className={`p-6 rounded-xl text-white font-semibold shadow flex flex-col items-center transition disabled:opacity-50 ${color}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" /> Traitement...
        </span>
      ) : (
        <>
          {icon}
          <span className="mt-1">{label}</span>
          <span className="text-xs mt-2">{sub}</span>
        </>
      )}
    </button>
  );
}
