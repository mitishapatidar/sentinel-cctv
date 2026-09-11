import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/live-stream": {
        target: "https://cctv.corp8.cloud",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/live-stream/, ""),
        headers: {
          Referer: "https://cctv.corp8.cloud/",
          Origin: "https://cctv.corp8.cloud",
        },
      },
    },
  },
});
