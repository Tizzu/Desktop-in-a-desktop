import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

// Usa un browser Chromium già installato (Brave, Chrome…): nessun download. Si può forzare con E2E_BROWSER.
const CANDIDATES = [
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/brave-browser',
  '/usr/bin/google-chrome',
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = process.env.E2E_BROWSER ?? CANDIDATES.find((p) => fs.existsSync(p));

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1100, height: 700 },
    launchOptions: { executablePath },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://127.0.0.1:4173/newtab.html',
    reuseExistingServer: false,
  },
});
