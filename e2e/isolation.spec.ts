import { expect, test } from '@playwright/test';
import { dragToolTo, openApp, widgets } from './helpers';

// Verifica che il canale di sincronizzazione resti dentro l'app: un sito web (altra origine) non può né
// ascoltare le modifiche né inviarne di false. Come controllo, una pagina con l'origine giusta può fare entrambe
// le cose: così il test fallirebbe davvero se l'isolamento non ci fosse.
const FORGED_WIDGET = { id: 'intruso', type: 'postit', x: 0, y: 0, w: 100, h: 100, rot: 0, state: {} };

test('un sito esterno non può ascoltare né inviare nulla sul canale', async ({ context }) => {
  const app = await context.newPage();
  await openApp(app);

  // Pagina con la STESSA origine dell'app (una pagina vuota servita dal test): fa da controllo.
  const sameOrigin = await context.newPage();
  await sameOrigin.route('**/controllo.html', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>controllo</title>' }));
  await sameOrigin.goto('/controllo.html');
  expect(new URL(sameOrigin.url()).origin).toBe(new URL(app.url()).origin);

  // Pagina con un'ALTRA origine, servita senza rete.
  const foreign = await context.newPage();
  await foreign.route('https://example.test/**', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>sito esterno</title>' }),
  );
  await foreign.goto('https://example.test/');
  expect(new URL(foreign.url()).origin).not.toBe(new URL(app.url()).origin);

  const listen = () => {
    const w = window as unknown as { __got: unknown[]; __ch: BroadcastChannel };
    w.__got = [];
    w.__ch = new BroadcastChannel('desktop-in-a-desktop'); // stesso nome usato dall'app
    w.__ch.onmessage = (e) => w.__got.push(e.data);
  };
  await sameOrigin.evaluate(listen);
  await foreign.evaluate(listen);
  const received = (p: typeof app) => p.evaluate(() => (window as unknown as { __got: { from: string; kind: string }[] }).__got);

  // 1) Ascoltare: l'app invia una modifica. La pagina con la stessa origine la riceve, quella esterna no.
  await dragToolTo(app, 'Sticky note', 400, 250);
  await expect(widgets(app)).toHaveCount(1);
  await expect.poll(async () => (await received(sameOrigin)).length).toBeGreaterThan(0); // il controllo funziona
  await app.waitForTimeout(500);
  expect(await received(foreign)).toEqual([]);

  // 2) Chiedere lo stato: il sito esterno manda "hello" come farebbe una scheda nuova. Nessuno gli risponde.
  await foreign.evaluate(() => (window as unknown as { __ch: BroadcastChannel }).__ch.postMessage({ kind: 'hello', from: 'intruso' }));
  await app.waitForTimeout(500);
  expect(await received(foreign)).toEqual([]);

  // 3) Inviare: il sito esterno prova a inserire un widget falso. L'app non lo vede.
  const forge = (p: typeof app) =>
    p.evaluate(
      (widget) => (window as unknown as { __ch: BroadcastChannel }).__ch.postMessage({ kind: 'action', from: 'intruso', action: { type: 'addWidget', widget } }),
      FORGED_WIDGET,
    );
  await forge(foreign);
  await app.waitForTimeout(500);
  await expect(widgets(app)).toHaveCount(1);
  expect((await received(sameOrigin)).some((m) => m.from === 'intruso')).toBe(false);

  // Controllo: lo stesso identico messaggio, inviato da una pagina con l'origine giusta, viene applicato.
  await forge(sameOrigin);
  await expect(widgets(app)).toHaveCount(2);
});
