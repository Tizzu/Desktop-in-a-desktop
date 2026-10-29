import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { it as italian } from './i18n.it';
import { isLang, translate } from './i18n';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) && !/i18n\.it/.test(f) ? [p] : [];
  });

// Testi inglesi usati dall'interfaccia: t('…') e le etichette dichiarate come `label: '…'`.
function usedTexts() {
  const found = new Set<string>();
  const unescape = (s: string) => s.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  for (const f of [...files('src'), ...files('entrypoints')]) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) found.add(unescape(m[1]!));
    for (const m of src.matchAll(/\blabel:\s*'((?:[^'\\]|\\.)*)'/g)) found.add(unescape(m[1]!));
    for (const m of src.matchAll(/\btranslate\(\s*\w+,\s*'((?:[^'\\]|\\.)*)'/g)) found.add(unescape(m[1]!));
    for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) found.add(unescape(m[1]!));
  }
  return found;
}

/** Ogni stringa tra apici che compare nel codice: serve a trovare traduzioni rimaste senza uso. */
function allLiterals() {
  const lits = new Set<string>();
  for (const f of [...files('src'), ...files('entrypoints')]) {
    for (const m of readFileSync(f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) lits.add(m[1]!.replace(/\\n/g, '\n').replace(/\\'/g, "'"));
  }
  return lits;
}

describe('traduzioni', () => {
  const used = usedTexts();

  it('ogni testo dell’interfaccia ha la traduzione italiana (se diversa dall’inglese)', () => {
    // Nomi che non cambiano: unità, sigle, città.
    const same = (s: string) => /^[\d\W]*$/.test(s) || ['km', 'm', 'cm', 'mm', 'kg', 'g', 'mg', 'l', 'ml', 'mph', 'm/s', 'km/h', 'K', 'Timer', 'Pomodoro', 'Agenda', 'Volume', 'New York', 'Los Angeles', 'Mumbai', 'Sydney', 'Tokyo', 'Dubai', 'Shanghai', 'Auckland', 'lb', 'oz', 'fl oz (US)', 'min', 'Stop', 'Language', 'English', 'Italiano', '°C', '°F', 'Memory'].includes(s);
    const missing = [...used].filter((s) => !(s in italian) && !same(s));
    expect(missing).toEqual([]);
  });

  it('non restano traduzioni di testi che non esistono più', () => {
    const lits = allLiterals();
    const stale = Object.keys(italian).filter((k) => !used.has(k) && !lits.has(k));
    expect(stale).toEqual([]);
  });

  it('sostituisce i segnaposto e ripiega sull’inglese se manca la voce', () => {
    expect(translate('it', '{n} to do', { n: 3 })).toBe('3 da fare');
    expect(translate('en', '{n} to do', { n: 3 })).toBe('3 to do');
    expect(translate('it', 'Nonexistent text')).toBe('Nonexistent text');
    expect(translate('en', 'Hello {name}', {})).toBe('Hello {name}');
  });

  it('riconosce solo le lingue disponibili', () => {
    expect(isLang('en') && isLang('it')).toBe(true);
    expect(isLang('fr')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});
