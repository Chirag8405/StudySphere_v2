import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist/server",
    rollupOptions: {
      input: {
        "node-build-production": resolve(
          __dirname,
          "server/node-build-production.ts",
        ),
        "api-production": resolve(__dirname, "server/api-production.ts"),
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
