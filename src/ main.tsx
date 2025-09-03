import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { FavoritesProvider } from "./context/FavoritesContext"; // ✅ NEW

import "./index.css"; // Tailwind + styles globaux

/* ============================================================================
 *  Point d’entrée React – UInova v6
 * ========================================================================== */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <ProjectProvider>
            <FavoritesProvider>
              <App />
              {/* ✅ Notifications globales pro */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className:
                    "bg-slate-900 text-white text-sm rounded-lg shadow-lg px-4 py-2",
                  success: { className: "bg-green-600 text-white" },
                  error: { className: "bg-red-600 text-white" },
                  loading: { className: "bg-yellow-500 text-white" },
                }}
              />
            </FavoritesProvider>
          </ProjectProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
