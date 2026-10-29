import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// Controlli sul pacchetto compilato (nessun browser): proteggono le garanzie su privacy e isolamento.
const BUILD = path.resolve('.output/chrome-mv3');
const manifest = JSON.parse(fs.readFileSync(path.join(BUILD, 'manifest.json'), 'utf8'));

test('il manifest chiede solo i permessi necessari', () => {
  expect(manifest.manifest_version).toBe(3);
  expect([...manifest.permissions].sort()).toEqual(['alarms', 'notifications', 'search', 'storage']);
  // Niente accesso ai siti, niente codice dentro le pagine web, niente messaggi dall'esterno, niente CSP allentata.
  for (const key of ['host_permissions', 'optional_host_permissions', 'optional_permissions', 'content_scripts', 'externally_connectable', 'web_accessible_resources', 'content_security_policy']) {
    expect(manifest[key], key).toBeUndefined();
  }
  expect(manifest.chrome_url_overrides).toEqual({ newtab: 'newtab.html' });
});

// Host che compaiono (come testo, non come richieste) nel codice compilato. Se ne compare uno nuovo il test
// fallisce: va guardato prima di aggiungerlo qui.
const ALLOWED_HOSTS = new Set([
  'www.w3.org', // namespace SVG
  'react.dev', // link nei messaggi d'errore di React
  'wxt.dev', // riferimenti nel codice di supporto
  'github.com', // idem
  'duckduckgo.com', // ripiego della ricerca quando l'API del browser non è disponibile
]);

function* files(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(full);
    else if (/\.(js|html|css|json)$/.test(e.name)) yield full;
  }
}

test('il codice compilato non contatta host sconosciuti', () => {
  const found = new Set<string>();
  for (const f of files(BUILD)) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) found.add(m[1]!);
  }
  expect([...found].filter((h) => !ALLOWED_HOSTS.has(h))).toEqual([]);
});

test('la pagina non carica script o stili da fuori e non ha script inline', () => {
  const html = fs.readFileSync(path.join(BUILD, 'newtab.html'), 'utf8');
  const tags = [...html.matchAll(/<(script|link)\b[^>]*>/g)].map((m) => m[0]);
  expect(tags.length).toBeGreaterThan(0);
  for (const tag of tags) expect(tag, tag).not.toMatch(/(src|href)=["']?(https?:)?\/\//);
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>\s*\S/); // niente script inline (vietati dalla CSP delle estensioni)
});
