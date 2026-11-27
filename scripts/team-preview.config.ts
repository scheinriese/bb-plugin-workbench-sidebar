import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./team-preview", import.meta.url)),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../vendor/shared-ui", import.meta.url)),
    },
  },
  server: { host: "0.0.0.0", allowedHosts: [".on.boat.dev", ".on.ascii.dev"] },
});
