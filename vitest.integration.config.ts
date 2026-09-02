import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Config separada para os testes de integração da leitura de 7
 * segmentos (`tests/integration/`): rodam o OpenCV.js (WASM) de
 * verdade e precisam de um `<canvas>` real em Node (pacote `canvas`,
 * já que o jsdom sozinho não implementa `getContext('2d')`). Mantidos
 * fora de `vitest.config.ts`/`npm test` porque são mais lentos e têm
 * uma dependência extra — ver docs/testing.md.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    testTimeout: 20000,
  },
});
