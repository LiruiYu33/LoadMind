import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const frontendInstance = {
  instanceId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
};

function loadmindFrontendInstancePlugin(): Plugin {
  const sendInstance = (_req: unknown, res: { setHeader: (name: string, value: string) => void; end: (body: string) => void }) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(frontendInstance));
  };

  return {
    name: "loadmind-frontend-instance",
    configureServer(server) {
      server.middlewares.use("/__loadmind_frontend_instance", sendInstance);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/__loadmind_frontend_instance", sendInstance);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), loadmindFrontendInstancePlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
