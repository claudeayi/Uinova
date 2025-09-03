// src/pages/PaymentPendingPage.tsx
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Loader2 } from "lucide-react";

export default function PaymentPendingPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
        <h1 className="text-3xl font-bold text-indigo-600">⏳ Paiement en cours</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          Votre transaction est en attente de confirmation par le fournisseur
          (banque, opérateur mobile ou plateforme). Cela peut prendre quelques
          minutes.
        </p>
        <div className="flex gap-4">
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
      </div>
    </DashboardLayout>
  );
}
