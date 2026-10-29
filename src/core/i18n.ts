import { createContext, useCallback, useContext } from 'react';
import { it } from './i18n.it';

export type Lang = 'en' | 'it';

export const LANGUAGES: { id: Lang; label: string; locale: string }[] = [
  { id: 'en', label: 'English', locale: 'en-GB' },
  { id: 'it', label: 'Italiano', locale: 'it-IT' },
];

export const isLang = (v: unknown): v is Lang => LANGUAGES.some((l) => l.id === v);

// Il testo in codice è l'inglese; le altre lingue lo traducono con questa tabella. Senza voce si mostra l'inglese.
const tables: Record<Lang, Record<string, string>> = { en: {}, it };

export type Params = Record<string, string | number>;

/** Traduce `text` (inglese) nella lingua scelta e sostituisce i segnaposto `{nome}`. */
export function translate(lang: Lang, text: string, params?: Params): string {
  const s = tables[lang][text] ?? text;
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}

export const localeOf = (lang: Lang) => LANGUAGES.find((l) => l.id === lang)!.locale;

export const LangContext = createContext<Lang>('en');

export const useLang = () => useContext(LangContext);
export const useLocale = () => localeOf(useLang());

/** Funzione di traduzione legata alla lingua corrente. */
export function useT() {
  const lang = useLang();
  return useCallback((text: string, params?: Params) => translate(lang, text, params), [lang]);
}
