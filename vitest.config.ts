import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal Vitest config for the Next.js 16 migration foundation layer.
//
// - `environment: "node"` matches the server-side libs under test (src/lib/api.ts,
//   authCookies.ts, endpoints.ts, requireAuth.ts) and is the Vitest default, so it
//   does not change behaviour for the pre-existing src/__tests__/legal-content.test.ts.
// - `@/*` mirrors tsconfig.json's path alias so tests can import via "@/lib/...".
// - `server-only` is stubbed to an empty module: src/lib/api.ts starts with
//   `import "server-only"`, whose real entry THROWS outside a react-server bundle.
//   We alias it to the package's own shipped empty.js rather than editing api.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // src/lib/api.ts reads `process.env.BACKEND_URL!` at module-eval time. Pin a
    // deterministic value here so tests are hermetic regardless of the shell env
    // or a local .env file (the fetch mock matches this base).
    env: {
      BACKEND_URL: "http://backend.test",
    },
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
