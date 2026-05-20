import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  server: {
    // Use "localhost" for local-only dev. Change to "::" for Docker / WSL
    // where the dev server must be reachable from outside the container.
    host: "localhost",
    port: 8080,
  },
  plugins: [react(), nodePolyfills({ include: ["buffer"] })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@testflow/shared": path.resolve(__dirname, "../packages/shared/src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy third-party libs into their own chunks so they cache
        // independently and don't bloat the main entry. PDF/Excel are also
        // dynamic-imported at call sites for true on-demand loading.
        manualChunks: {
          recharts: ["recharts"],
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
          ],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
