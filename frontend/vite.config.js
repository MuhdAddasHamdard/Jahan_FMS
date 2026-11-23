import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const offlineShell = () => ({
  name: "jahan-fms-offline-shell",
  apply: "build",
  generateBundle: {
    order: "post",
    handler(_options, bundle) {
      const assets = [...new Set(["index.html", "favicon.svg", ...Object.keys(bundle)])].sort();
      const template = readFileSync(new URL("./src/offline/service-worker.js", import.meta.url), "utf8");
      const hash = createHash("sha256").update(template).update(JSON.stringify(assets));
      for (const asset of Object.values(bundle)) {
        hash.update(asset.type === "asset" ? asset.source : asset.code);
      }
      this.emitFile({
        type: "asset",
        fileName: "service-worker.js",
        source: template.replace("/* build-time assets */ []", JSON.stringify(assets))
          .replace("__BUILD__", hash.digest("hex").slice(0, 16)),
      });
    },
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineShell()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
