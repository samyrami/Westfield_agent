import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Permitir override desde .env.local del front sin tocar este archivo:
  //   VITE_API_PROXY_TARGET=http://localhost:3001    → server local
  //   VITE_API_PROXY_TARGET=http://3.16.91.222:8080  → backend en AWS
  //
  // Default: backend en AWS. Si necesitás trabajar contra el server Hono
  // local, definí VITE_API_PROXY_TARGET en .env.local o usá `npm run dev:local`.
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget =
    env.VITE_API_PROXY_TARGET || "http://3.16.91.222:8080";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Shim del builtin `util` de Node: visage lee util.inspect.custom al
        // importar y en el browser quedaría undefined (rompe el avatar 3D).
        util: path.resolve(__dirname, "./src/shims/util.ts"),
      },
    },
    // Pre-bundle de three para dev rápido (el avatar ya no usa visage/fiber)
    optimizeDeps: {
      include: ["three"],
    },
    build: {
      // three + drei superan legítimamente el límite default de 500KB
      chunkSizeWarningLimit: 1600,
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
