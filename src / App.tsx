import { Routes, Route } from 'react-router-dom';
import Navbar from './layouts/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import MarketplacePage from './pages/MarketplacePage';
import PricingPage from './pages/PricingPage';
import PaymentPage from './pages/PaymentPage';
import PreviewPage from './pages/PreviewPage';
import ExportPage from './pages/ExportPage';
import NotFoundPage from './pages/NotFoundPage';
import { Toaster } from "react-hot-toast"; // <--- Ajout ici

function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} /> {/* <--- Toaster global */}
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/preview/:projectId/:pageId" element={<PreviewPage />} />
        <Route path="/export/:projectId/:pageId" element={<ExportPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
