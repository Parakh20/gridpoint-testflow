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
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
