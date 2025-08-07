export default function PaymentPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Paiement</h1>
      <p>Cette page permet d'intégrer Stripe, PayPal ou Mobile Money.</p>
      <div className="mt-4 space-x-4">
        <button className="bg-purple-600 text-white px-4 py-2 rounded">Stripe</button>
        <button className="bg-yellow-600 text-white px-4 py-2 rounded">PayPal</button>
        <button className="bg-orange-600 text-white px-4 py-2 rounded">Orange/MTN</button>
      </div>
    </div>
  );
}
