import { describe, expect, it } from 'vitest';
import { exportFileName, exportJson, exportText, parseImport, parseImportText } from './backup';
import { createDefaultData, sanitize } from './storage';
import { reducer } from './store';

const withWidget = () =>
  reducer(createDefaultData(), { type: 'addWidget', widget: { id: 'a', type: 'postit', x: 5, y: 6, w: 100, h: 100, rot: 1, state: { text: 'ciao' } } });

describe('esportazione e importazione', () => {
  it('ciò che si esporta si reimporta identico', () => {
    const data = withWidget();
    expect(parseImport(exportJson(data))).toEqual(sanitize(data));
  });
  it('il nome del file porta la data', () => {
    expect(exportFileName(new Date('2026-10-30T12:00:00Z'))).toBe('desktop-in-a-desktop-2026-10-30.json');
  });
  it('accetta anche un salvataggio grezzo e uno di versione precedente', () => {
    expect(parseImport(JSON.stringify(withWidget()))?.workspaces[0]!.widgets).toHaveLength(1);
    const v1 = { version: 1, activeWorkspaceId: 'a', workspaces: [{ id: 'a', name: 'x', order: 0, widgets: [{ id: 'w', type: 'postit', x: 1, y: 2, w: 3, h: 4, z: 1, state: {} }] }] };
    expect(parseImport(JSON.stringify(v1))?.version).toBe(3);
  });
  it('rifiuta file che non sono un backup', () => {
    for (const bad of ['', 'non json', '[]', '{}', '{"workspaces":"x"}', '{"format":"altro","data":{}}', '{"format":"desktop-in-a-desktop","data":null}']) {
      expect(parseImport(bad)).toBeUndefined();
    }
  });
});

describe('esportazione come testo', () => {
  it('una riga sola, senza caratteri delicati, e si reimporta identica', async () => {
    const data = withWidget();
    const text = await exportText(data);
    expect(text).toMatch(/^DIAD1:[A-Za-z0-9_-]+:END$/);
    expect(await parseImportText(text)).toEqual(sanitize(data));
  });
  it('regge righe spezzate e testo intorno', async () => {
    const text = await exportText(withWidget());
    const mangled = `Guarda qui:\n${text.slice(0, 30)}\n  ${text.slice(30, 90)}\n${text.slice(90)}\n\nfine`;
    expect((await parseImportText(mangled))?.workspaces[0]!.widgets).toHaveLength(1);
  });
  it('è molto più corta del JSON', async () => {
    const data = withWidget();
    data.workspaces[0]!.widgets[0]!.state = { text: 'ciao '.repeat(2000) };
    expect((await exportText(data)).length).toBeLessThan(exportJson(data).length / 5);
  });
  it('rifiuta testo che non è un backup', async () => {
    for (const bad of ['', 'ciao', 'DIAD1:', 'DIAD1:abc', 'DIAD1:abc:END', 'DIAD1:!!!:END', `DIAD1:${btoa('non gzip')}:END`]) expect(await parseImportText(bad)).toBeUndefined();
  });
});
