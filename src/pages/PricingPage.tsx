// src/pages/PricingPage.tsx
import { useNavigate } from "react-router-dom";

export default function PricingPage() {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Freemium",
      price: "0€",
      desc: "Accès de base aux fonctionnalités de l’éditeur.",
      features: [
        "✔️ Créez jusqu’à 3 projets",
        "✔️ Export HTML basique",
        "✔️ Stockage limité",
      ],
      action: () => navigate("/payment?plan=FREE"),
      highlight: false,
    },
    {
      name: "Premium",
      price: "9,99€/mois",
      desc: "Accès complet + IA + exports avancés.",
      features: [
        "✔️ Projets illimités",
        "✔️ Assistant IA intégré",
        "✔️ Export HTML, React & Flutter",
        "✔️ Accès complet Marketplace",
        "✔️ Support prioritaire",
      ],
      action: () => navigate("/payment?plan=PRO"),
      highlight: true,
    },
    {
      name: "Business",
      price: "29,99€/mois",
      desc: "Pour les équipes et agences.",
      features: [
        "✔️ Tout Premium",
        "✔️ Collaboration en temps réel",
        "✔️ Déploiements automatiques",
        "✔️ Monitoring & Analytics",
        "✔️ Branding personnalisé",
      ],
      action: () => navigate("/payment?plan=BUSINESS"),
      highlight: false,
    },
    {
      name: "Enterprise",
      price: "Sur devis",
      desc: "Solution complète pour grandes entreprises.",
      features: [
        "✔️ Tout Business",
        "✔️ Déploiement sur infrastructure dédiée",
        "✔️ SLA & support 24/7",
        "✔️ Formation & onboarding équipe",
        "✔️ Intégrations sur mesure",
      ],
      action: () => navigate("/payment?plan=ENTERPRISE"),
      highlight: false,
    },
  ];

  return (
    <div className="py-10 px-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-10">
        💎 Choisissez le plan qui vous convient
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`border rounded-xl p-6 flex flex-col shadow transition hover:shadow-lg ${
              plan.highlight
                ? "border-blue-600 bg-blue-50 dark:bg-slate-800"
                : "bg-white dark:bg-slate-900"
            }`}
          >
            <h2 className="text-xl font-bold mb-2 text-center">{plan.name}</h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
              {plan.desc}
            </p>
            <p className="text-3xl font-extrabold text-center mb-4">
              {plan.price}
            </p>
            <ul className="space-y-2 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm">
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={plan.action}
              className={`mt-6 px-4 py-2 rounded font-semibold ${
                plan.highlight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 dark:bg-slate-700 dark:text-white hover:bg-gray-300"
              }`}
            >
              {plan.name === "Freemium" ? "Commencer" : "Choisir"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
