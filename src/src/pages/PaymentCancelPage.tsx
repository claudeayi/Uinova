import { Link } from "react-router-dom";

export default function PaymentCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
      <h1 className="text-3xl font-bold text-red-600">❌ Paiement annulé</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Vous avez annulé l’opération ou une erreur est survenue.
      </p>
      <Link
        to="/pricing"
        className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
      >
        Revenir aux plans
      </Link>
    </div>
  );
}
