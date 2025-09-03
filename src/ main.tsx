import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { FavoritesProvider } from "./context/FavoritesContext"; // ✅ Favoris global

import "./index.css"; // Tailwind + styles globaux

/* ============================================================================
 *  Point d’entrée React – UInova v7
 *  Hiérarchie : Auth → Workspace → Project → Favorites → App
 * ========================================================================== */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <ProjectProvider>
            <FavoritesProvider>
              <App />

              {/* ✅ Notifications globales pro & accessibles */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    padding: "0.5rem 1rem",
                  },
                  success: {
                    style: { background: "#16a34a", color: "#fff" },
                    icon: "✅",
                  },
                  error: {
                    style: { background: "#dc2626", color: "#fff" },
                    icon: "❌",
                  },
                  loading: {
                    style: { background: "#f59e0b", color: "#fff" },
                    icon: "⏳",
                  },
                }}
              />
            </FavoritesProvider>
          </ProjectProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
