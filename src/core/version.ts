import { browser } from 'wxt/browser';

// Versione di package.json, inserita in fase di build (wxt.config.ts): serve quando la pagina non gira come estensione (test).
declare const __APP_VERSION__: string | undefined;

/** Versione dell'app: quella del manifest; fuori dall'estensione, quella di build; altrimenti vuota. */
export function appVersion() {
  try { return browser.runtime.getManifest().version; } catch { return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''; }
}

/** Confronta due versioni "1.2.3": negativo se a < b, 0 se uguali, positivo se a > b. Una versione vuota vale 0.0.0. */
export function compareVersions(a: string, b: string) {
  const parts = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pa = parts(a), pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
