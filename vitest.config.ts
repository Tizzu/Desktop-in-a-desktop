import { defineConfig } from 'vitest/config';

// I test e2e (cartella e2e/) li esegue Playwright, non Vitest.
export default defineConfig({
  test: { exclude: ['e2e/**', 'node_modules/**', '.output/**', '.wxt/**'] },
});
