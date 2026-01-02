import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Plugin to suppress Recharts warnings
const suppressRechartsWarnings = () => {
  return {
    name: "suppress-recharts-warnings",
    configResolved() {
      // Override console in development
      if (process.env.NODE_ENV === "development") {
        const originalWarn = console.warn;
        console.warn = (...args) => {
          const message = args.join(" ");
          if (
            message.includes(
              "defaultProps will be removed from function components",
            ) ||
            message.includes("Support for defaultProps will be removed")
          ) {
            return;
          }
          originalWarn.apply(console, args);
        };
      }
    },
    transformIndexHtml: {
      order: "pre" as const,
      handler(html) {
        // Inject warning suppression script at the very beginning
        return html.replace(
          "<head>",
          `<head>
    <script>
      (function() {
        const originalWarn = console.warn;
        console.warn = function(...args) {
          const msg = args.map(a => String(a)).join(' ');
          if (msg.includes('defaultProps will be removed') || 
              msg.includes('Support for defaultProps will be removed')) return;
          originalWarn.apply(console, args);
        };
      })();
    </script>`,
        );
      },
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), suppressRechartsWarnings()],
  root: "client",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  optimizeDeps: {
    include: ["recharts"],
  },
  server: {
    port: 8080,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "../dist/spa",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "client/index.html"),
      },
    },
  },
  publicDir: "../public",
  define: {
    // Suppress React warnings in production
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
  },
});
