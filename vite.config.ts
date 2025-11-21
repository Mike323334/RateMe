import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared","."],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./client', import.meta.url)),
      "@shared": fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // Dynamic import to avoid loading Supabase config during build
      import("./server").then(({ createServer }) => {
        const app = createServer();
        // Add Express app as middleware to Vite dev server
        server.middlewares.use(app);
      });
    },
  };
}
