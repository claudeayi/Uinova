// src/main.tsx ou src/index.tsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";

// 🌍 Contexts globaux
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { ThemeProvider } from "./context/ThemeContext"; // ✅ Dark/Light mode context

// 🛡️ Error Boundary global
import ErrorBoundary from "./components/ErrorBoundary";

// 🎨 Styles globaux
import "./index.css";

// ⚡ Query client (React Query)
const queryClient = new QueryClient();

/* ============================================================================
 *  Point d’entrée React – UInova v8
 *  Hiérarchie : ErrorBoundary → Theme → Auth → Workspace → Project → Favorites → Query → App
 * ========================================================================== */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <ProjectProvider>
                <FavoritesProvider>
                  <QueryClientProvider client={queryClient}>
                    <Suspense fallback={<div className="p-6 text-center">⏳ Chargement...</div>}>
                      <App />
                    </Suspense>

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
                  </QueryClientProvider>
                </FavoritesProvider>
              </ProjectProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
