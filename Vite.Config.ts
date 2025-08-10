import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173, // ou un autre port si besoin
    open: true, // ouvre le navigateur au démarrage
  },
  build: {
    outDir: "dist",
    sourcemap: true
  },
});
