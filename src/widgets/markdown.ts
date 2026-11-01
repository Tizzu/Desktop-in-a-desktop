export type Block =
  | { kind: 'heading'; level: number; text: string; line: number }
  | { kind: 'item'; text: string; checked?: boolean; line: number }
  | { kind: 'para'; text: string; line: number }
  | { kind: 'blank'; line: number };

/** Markdown minimale: titoli, elenchi, caselle spuntabili, paragrafi. */
export function parseBlocks(src: string): Block[] {
  return src.split('\n').map((raw, line): Block => {
    let m: RegExpExecArray | null;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(raw))) return { kind: 'heading', level: m[1]!.length, text: m[2]!, line };
    if ((m = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(raw))) return { kind: 'item', checked: m[1] !== ' ', text: m[2]!, line };
    if ((m = /^\s*[-*]\s+(.*)$/.exec(raw))) return { kind: 'item', text: m[1]!, line };
    if (raw.trim() === '') return { kind: 'blank', line };
    return { kind: 'para', text: raw, line };
  });
}

export interface Inline { kind: 'text' | 'bold' | 'italic' | 'strike' | 'code'; text: string }

export function parseInline(text: string): Inline[] {
  return text
    .split(/(\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((p): Inline => {
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return { kind: 'bold', text: p.slice(2, -2) };
      if (p.startsWith('~~') && p.endsWith('~~') && p.length > 4) return { kind: 'strike', text: p.slice(2, -2) };
      if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return { kind: 'code', text: p.slice(1, -1) };
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return { kind: 'italic', text: p.slice(1, -1) };
      return { kind: 'text', text: p };
    });
}

/** Spunta/toglie la casella della riga indicata. */
export function toggleTask(src: string, line: number): string {
  const lines = src.split('\n');
  const l = lines[line];
  if (l === undefined) return src;
  lines[line] = l.replace(/\[( |x|X)\]/, (_, c: string) => (c === ' ' ? '[x]' : '[ ]'));
  return lines.join('\n');
}

// --- Modifica del testo dalla barra dei pulsanti: tutte funzioni pure, che restituiscono testo e nuova selezione ---

export interface Edit { text: string; start: number; end: number }

/**
 * Racchiude la selezione tra `marker` (es. "**"), oppure li toglie se ci sono già. Senza selezione inserisce la coppia
 * di marcatori con il cursore in mezzo.
 */
export function wrapSelection(text: string, start: number, end: number, marker: string): Edit {
  const m = marker.length;
  const before = text.slice(0, start), sel = text.slice(start, end), after = text.slice(end);
  // Con un marcatore di un solo carattere ("*"), un "**" attorno non conta: è un grassetto, non un corsivo.
  const alone = m > 1 || (before.at(-2) !== marker && after[1] !== marker);
  if (before.endsWith(marker) && after.startsWith(marker) && alone) {
    return { text: before.slice(0, -m) + sel + after.slice(m), start: start - m, end: end - m };
  }
  if (sel.length >= 2 * m && sel.startsWith(marker) && sel.endsWith(marker)) {
    return { text: before + sel.slice(m, -m) + after, start, end: end - 2 * m };
  }
  return { text: before + marker + sel + marker + after, start: start + m, end: end + m };
}

export type LineKind = 'heading' | 'bullet' | 'task';

const PREFIX = /^(#{1,3} |[-*] \[[ xX]\] |[-*] )/;

/**
 * Cambia l'inizio delle righe toccate dalla selezione. "heading" fa girare i livelli (niente → # → ## → ### → niente);
 * "bullet" e "task" mettono il prefisso, o lo tolgono se la prima riga lo ha già. Un prefisso diverso viene sostituito.
 */
export function setLinePrefix(text: string, start: number, end: number, kind: LineKind): Edit {
  const lines = text.split('\n');
  const starts: number[] = [];
  let pos = 0;
  for (const l of lines) { starts.push(pos); pos += l.length + 1; }
  const firstLine = Math.max(0, starts.findLastIndex((s) => s <= start));
  const lastLine = Math.max(firstLine, starts.findLastIndex((s) => s <= Math.max(start, end - (end > start && text[end - 1] === '\n' ? 1 : 0))));

  const cur = PREFIX.exec(lines[firstLine]!)?.[0] ?? '';
  const level = cur.startsWith('#') ? cur.length - 1 : 0;
  const target =
    kind === 'heading' ? (level >= 3 ? '' : '#'.repeat(level + 1) + ' ')
    : kind === 'bullet' ? (/^[-*] $/.test(cur) ? '' : '- ')
    : (/^[-*] \[[ xX]\] $/.test(cur) ? '' : '- [ ] ');

  let delta = 0, firstDelta = 0;
  for (let i = firstLine; i <= lastLine; i++) {
    const old = PREFIX.exec(lines[i]!)?.[0] ?? '';
    lines[i] = target + lines[i]!.slice(old.length);
    const d = target.length - old.length;
    if (i === firstLine) firstDelta = d;
    delta += d;
  }
  return { text: lines.join('\n'), start: Math.max(starts[firstLine]!, start + firstDelta), end: end + delta };
}
