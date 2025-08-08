export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-blue-700">404</h1>
        <p className="text-lg mb-6 text-gray-600">Page non trouvée</p>
        <a
          href="/"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
