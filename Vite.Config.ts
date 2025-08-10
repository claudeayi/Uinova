import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // Optionnel : ajout du plugin pour classnames conditionnels
          "@babel/plugin-transform-react-jsx",
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Accès rapide via @
    },
  },
  server: {
    port: 5173, // Port de dev (modifiable si déjà utilisé)
    open: true, // Ouvre le navigateur automatiquement
    strictPort: false, // Permet de changer de port automatiquement si occupé
  },
  build: {
    outDir: "dist",
    sourcemap: true, // Facilite le debug
    chunkSizeWarningLimit: 1000, // Evite les warnings sur gros bundles
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "zust
