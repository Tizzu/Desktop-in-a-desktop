import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline, setLinePrefix, toggleTask, wrapSelection } from './markdown';

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

describe('modifica del testo', () => {
  it('grassetto: racchiude la selezione e la toglie se già presente', () => {
    expect(wrapSelection('ciao mondo', 5, 10, '**')).toEqual({ text: 'ciao **mondo**', start: 7, end: 12 });
    expect(wrapSelection('ciao **mondo**', 7, 12, '**')).toEqual({ text: 'ciao mondo', start: 5, end: 10 }); // marcatori fuori dalla selezione
    expect(wrapSelection('ciao **mondo**', 5, 14, '**')).toEqual({ text: 'ciao mondo', start: 5, end: 10 }); // marcatori dentro
  });
  it('senza selezione inserisce la coppia con il cursore in mezzo', () => {
    expect(wrapSelection('ab', 1, 1, '*')).toEqual({ text: 'a**b', start: 2, end: 2 });
  });
  it('il corsivo non scambia un grassetto per sé', () => {
    expect(wrapSelection('**x**', 2, 3, '*').text).toBe('***x***');
  });
  it('titoli: i livelli girano e tornano a niente', () => {
    let e = setLinePrefix('testo', 0, 0, 'heading');
    expect(e.text).toBe('# testo');
    e = setLinePrefix(e.text, 0, 0, 'heading'); expect(e.text).toBe('## testo');
    e = setLinePrefix(e.text, 0, 0, 'heading'); expect(e.text).toBe('### testo');
    e = setLinePrefix(e.text, 0, 0, 'heading'); expect(e.text).toBe('testo');
  });
  it('elenchi e caselle: si mettono, si tolgono e si sostituiscono, su più righe', () => {
    expect(setLinePrefix('a\nb\nc', 0, 3, 'bullet').text).toBe('- a\n- b\nc');
    expect(setLinePrefix('- a\n- b', 0, 7, 'bullet').text).toBe('a\nb');
    expect(setLinePrefix('- a', 0, 0, 'task').text).toBe('- [ ] a');
    expect(setLinePrefix('- [x] a', 0, 0, 'task').text).toBe('a');
    expect(setLinePrefix('# a', 0, 0, 'bullet').text).toBe('- a');
  });
  it('agisce sulla riga dove sta il cursore e sposta la selezione di conseguenza', () => {
    const e = setLinePrefix('uno\ndue', 5, 5, 'bullet');
    expect(e.text).toBe('uno\n- due');
    expect([e.start, e.end]).toEqual([7, 7]);
  });
  it('il barrato è riconosciuto', () => {
    expect(parseInline('a ~~b~~').map((i) => i.kind)).toEqual(['text', 'strike']);
  });
});
