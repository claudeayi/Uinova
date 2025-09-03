import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";

import "./index.css"; // Tailwind + styles globaux

// ✅ Point d’entrée React
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <ProjectProvider>
            <App />
            {/* ✅ Notifications globales pro */}
            <Toaster
              position="top-right"
              toastOptions={{
                className: "bg-gray-900 text-white text-sm rounded-lg shadow-lg",
                duration: 4000,
              }}
            />
          </ProjectProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
