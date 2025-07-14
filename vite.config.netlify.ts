import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist/netlify-functions",
    rollupOptions: {
      input: {
        api: resolve(__dirname, "server/netlify-function.ts"),
      },
      output: {
        format: "esm",
        entryFileNames: "[name].mjs",
      },
      external: [
        "express",
        "sqlite3",
        "bcryptjs",
        "jsonwebtoken",
        "uuid",
        "date-fns",
        "serverless-http",
      ],
    },
    target: "node18",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./client"),
      "@shared": resolve(__dirname, "./shared"),
    },
  },
});
