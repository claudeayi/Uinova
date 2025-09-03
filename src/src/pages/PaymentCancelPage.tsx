// src/pages/PaymentCancelPage.tsx
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
        <XCircle className="w-16 h-16 text-red-500" />
        <h1 className="text-3xl font-bold text-red-600">❌ Paiement annulé</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          L’opération a été annulée ou une erreur est survenue lors du processus
          de paiement. Aucun montant ne vous a été prélevé.
        </p>
        <div className="flex gap-4">
          <Link
            to="/pricing"
            className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 shadow transition"
          >
            🔄 Revenir aux plans
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
