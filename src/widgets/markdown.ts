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

export interface Inline { kind: 'text' | 'bold' | 'italic' | 'code'; text: string }

export function parseInline(text: string): Inline[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((p): Inline => {
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return { kind: 'bold', text: p.slice(2, -2) };
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
