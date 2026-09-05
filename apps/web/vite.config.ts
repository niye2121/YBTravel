import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Removes the browser-facing `/api` prefix before the request reaches NestJS.
 * The prefix lets the direct preview URL and HTTPS domain use same-origin
 * requests without exposing a deployment-specific API address.
 */
function stripApiPrefix(requestPath: string): string {
  return requestPath.replace(/^\/api/, "");
}

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    port: 5173,
  },
  preview: {
    allowedHosts: ["ybtravel.smrtgrp.com", "2.24.28.178", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://api:3001",
        changeOrigin: true,
        rewrite: stripApiPrefix,
      },
      "/socket.io": {
        target: "http://api:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
