import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline, toggleTask } from './markdown';

describe('markdown', () => {
  it('riconosce titoli, elenchi e caselle', () => {
    const b = parseBlocks('# Titolo\n- uno\n- [ ] da fare\n- [x] fatto\n\ntesto');
    expect(b.map((x) => x.kind)).toEqual(['heading', 'item', 'item', 'item', 'blank', 'para']);
    expect(b[2]).toMatchObject({ checked: false, text: 'da fare' });
    expect(b[3]).toMatchObject({ checked: true });
  });
  it('analizza grassetto, corsivo e codice', () => {
    expect(parseInline('a **b** *c* `d`').map((i) => i.kind)).toEqual(['text', 'bold', 'text', 'italic', 'text', 'code']);
  });
  it('alterna le caselle sulla riga giusta', () => {
    const t = '- [ ] a\n- [x] b';
    expect(toggleTask(t, 0)).toBe('- [x] a\n- [x] b');
    expect(toggleTask(t, 1)).toBe('- [ ] a\n- [ ] b');
  });
});
