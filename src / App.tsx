// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navbar from "./layouts/Navbar";

// Pages
import Dashboard from "./pages/Dashboard";
import EditorPage from "./pages/EditorPage";
import PreviewPage from "./pages/PreviewPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MarketplacePage from "./pages/MarketplacePage";
import PricingPage from "./pages/PricingPage";
import PaymentPage from "./pages/PaymentPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Barre de navigation (inclut le switch dark si tu as gardé ma version) */}
      <Navbar />

      {/* Contenu des pages */}
      <main className="container py-4">
        <Routes>
          {/* Accueil / Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Éditeur (ouvre un projet par id) */}
          <Route path="/editor/:id" element={<EditorPage />} />

          {/* Preview live d’une page d’un projet */}
          <Route path="/preview/:projectId/:pageId" element={<PreviewPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Marketplace / Tarifs / Paiement */}
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment" element={<PaymentPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Toaster global (notifications) */}
      <Toaster position="top-right" />
    </div>
  );
}
