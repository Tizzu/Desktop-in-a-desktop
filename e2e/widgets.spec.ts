import { expect, test, type Locator, type Page } from '@playwright/test';
import { addWidget, appData, openApp, seed } from './helpers';

const reload = async (page: Page) => {
  await page.waitForTimeout(600); // autosave con debounce
  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
};
const inkedPixels = (canvas: Locator) =>
  canvas.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
    return n;
  });

test.describe('widget con orologio finto', () => {
  test('timer: avvia, mette in pausa, riprende e scade', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Timer');
    const time = w.locator('.timer-time');
    await expect(time).toHaveText('05:00');

    await w.getByRole('button', { name: 'Avvia' }).click();
    await page.clock.runFor(120_000);
    await expect(time).toHaveText(/^(03:00|02:5\d)$/);

    await w.getByRole('button', { name: 'Pausa' }).click();
    const paused = await time.textContent();
    await page.clock.runFor(60_000);
    await expect(time).toHaveText(paused!); // in pausa il tempo non scorre

    await w.getByRole('button', { name: 'Riprendi' }).click();
    await page.clock.runFor(4 * 60_000);
    await expect(w.locator('.timer-note')).toHaveText('Tempo scaduto');
    await expect(time).toHaveText('00:00');
  });

  test('allo scoccare della mezzanotte acqua e obiettivo ripartono da zero', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 23, 59, 30) });
    await openApp(page);

    const water = await addWidget(page, 'Acqua', 300, 250);
    await water.getByRole('button', { name: '+ 250 ml' }).click();
    await expect(water.locator('.water-ml')).toContainText('250');

    const goal = await addWidget(page, 'Obiettivo', 700, 250);
    await goal.getByPlaceholder('Scrivi e premi Invio…').fill('finire la relazione');
    await goal.getByPlaceholder('Scrivi e premi Invio…').press('Enter');
    await expect(goal.locator('.goal-text')).toContainText('finire la relazione');

    await page.clock.runFor(60_000); // ora sono le 00:00:30 del giorno dopo, senza toccare nulla
    await expect(water.locator('.water-ml')).toContainText(/^0/);
    await expect(water.locator('.water-day[title*=": 250 ml"]')).toHaveCount(1); // ieri è rimasto nello storico
    await expect(goal.locator('.goal-label')).toContainText('Qual è la cosa più importante di oggi?');
    await expect(goal.locator('.goal-prev')).toContainText('finire la relazione');
  });
});

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    // Senza inclinazione casuale: i clic a una posizione precisa dentro un widget non dipendono dall'angolo.
    await seed(page, appData([], { tilt: false }));
  });

  test('post-it: il disegno a mano libera si salva, si annulla e si ritrova', async ({ page }) => {
    const w = await addWidget(page, 'Post-it');
    await w.getByRole('button', { name: '✎ Disegna' }).click();
    const canvas = w.locator('canvas.draw-layer');
    const b = (await canvas.boundingBox())!;
    await page.mouse.move(b.x + 30, b.y + 30);
    await page.mouse.down();
    await page.mouse.move(b.x + 150, b.y + 90, { steps: 12 });
    await page.mouse.up();
    expect(await inkedPixels(canvas)).toBeGreaterThan(50);

    await reload(page);
    const again = page.locator('.canvas .widget canvas.draw-layer');
    await expect.poll(() => inkedPixels(again)).toBeGreaterThan(50);

    await page.locator('.canvas .widget').first().getByRole('button', { name: 'Annulla ultimo tratto' }).click();
    await expect.poll(() => inkedPixels(again)).toBe(0);
  });

  test('da fare: aggiungere, spuntare, rimuovere i fatti, ritrovare', async ({ page }) => {
    const w = await addWidget(page, 'Da fare');
    const input = w.getByPlaceholder('Aggiungi e premi Invio…');
    for (const t of ['latte', 'pane']) {
      await input.fill(t);
      await input.press('Enter');
    }
    await expect(w.locator('.todo-list li')).toHaveCount(2);
    await w.locator('.todo-list input[type=checkbox]').first().check();
    await expect(w.locator('.todo-foot')).toContainText('1 da fare');
    await w.getByRole('button', { name: 'Rimuovi fatti' }).click();
    await expect(w.locator('.todo-list li')).toHaveCount(1);

    await reload(page);
    await expect(page.locator('.canvas .widget .todo-list li span')).toHaveText(['pane']);
  });

  test('link rapidi: rifiuta indirizzi pericolosi e apre gli altri in una nuova scheda isolata', async ({ page }) => {
    const w = await addWidget(page, 'Link rapidi');
    const [name, url] = [w.getByPlaceholder('Nome (facoltativo)'), w.getByPlaceholder('indirizzo.it')];

    await url.fill('javascript:alert(1)');
    await w.getByRole('button', { name: 'Aggiungi' }).click();
    await expect(url).toHaveClass(/bad/);
    await expect(w.locator('.links li')).toHaveCount(0);

    await name.fill('Esempio');
    await url.fill('example.com');
    await w.getByRole('button', { name: 'Aggiungi' }).click();
    const link = w.locator('.links a');
    await expect(link).toHaveAttribute('href', 'https://example.com/');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('taccuino: le caselle spuntate in lettura aggiornano il testo', async ({ page }) => {
    const w = await addWidget(page, 'Taccuino');
    await w.locator('textarea').fill('# Spesa\n- [ ] uno\n- [ ] due');
    await w.getByRole('button', { name: 'Leggi' }).click();
    await expect(w.locator('h1')).toHaveText('Spesa');
    await w.locator('.md-item input[type=checkbox]').first().check();
    await w.getByRole('button', { name: 'Scrivi' }).click();
    await expect(w.locator('textarea')).toHaveValue('# Spesa\n- [x] uno\n- [ ] due');
  });

  test('progresso: barra a mano, poi calcolata dai sotto-task', async ({ page }) => {
    const w = await addWidget(page, 'Progresso');
    const pct = w.locator('.prog-pct');
    const bar = w.locator('.prog-bar');
    const width = (await bar.boundingBox())!.width;
    await bar.click({ position: { x: width * 0.25, y: 6 } });
    await expect(pct).toContainText('25');
    await w.getByRole('button', { name: '+10%' }).click();
    await expect(pct).toContainText('35');

    await w.getByRole('radio', { name: 'Sotto-task' }).click();
    const input = w.getByPlaceholder('Aggiungi un sotto-task…');
    for (const t of ['uno', 'due']) {
      await input.fill(t);
      await input.press('Enter');
    }
    await expect(pct).toContainText('0');
    await w.locator('.prog-tasks input[type=checkbox]').first().check();
    await expect(pct).toContainText('50');
    await w.getByRole('radio', { name: 'Manuale' }).click();
    await expect(pct).toContainText('35'); // il valore a mano non si è perso
  });

  test('acqua: somma, toglie senza scendere sotto zero e si ritrova', async ({ page }) => {
    const w = await addWidget(page, 'Acqua');
    const ml = w.locator('.water-ml');
    await w.getByRole('button', { name: '+ 250 ml' }).click();
    await w.getByRole('button', { name: '+500' }).click();
    await expect(ml).toContainText('750');
    for (let i = 0; i < 5; i++) await w.getByRole('button', { name: 'Togli 250 ml' }).click({ force: true });
    await expect(ml).toContainText(/^0/);
    await w.getByRole('button', { name: '+ 250 ml' }).click();

    await reload(page);
    await expect(page.locator('.canvas .widget .water-ml')).toContainText('250');
  });

  test('immagine: il file viene ridotto e salvato nel widget', async ({ page }) => {
    const w = await addWidget(page, 'Immagine');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await w.locator('input[type=file]').setInputFiles({ name: 'rosso.png', mimeType: 'image/png', buffer: png });
    await expect(w.locator('img')).toHaveAttribute('src', /^data:image\/webp/);

    await reload(page);
    await expect(page.locator('.canvas .widget img')).toHaveAttribute('src', /^data:image\/webp/);
    // Un file che non è un'immagine viene ignorato.
    await page.locator('.canvas .widget').first().getByRole('button', { name: 'Togli' }).click();
    await page.locator('.canvas .widget input[type=file]').setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('ciao') });
    await expect(page.locator('.canvas .widget img')).toHaveCount(0);
  });

  test('abitudini, contatore, calendario e bolle conservano lo stato', async ({ page }) => {
    const habits = await addWidget(page, 'Abitudini', 100, 180);
    await habits.getByRole('button', { name: /Bere acqua \d{4}-\d{2}-\d{2}/ }).last().click(); // oggi è l'ultima colonna
    await expect(habits.locator('.habit-cell.on')).toHaveCount(1);

    const counter = await addWidget(page, 'Contatore', 480, 180);
    for (let i = 0; i < 3; i++) await counter.getByRole('button', { name: 'Aumenta' }).click();
    await expect(counter.locator('.counter-value')).toContainText('3');

    const calendar = await addWidget(page, 'Calendario', 740, 180);
    await calendar.locator('.cal-day', { hasText: /^15$/ }).click();
    await expect(calendar.locator('.cal-day.marked')).toHaveCount(1);

    const bubbles = await addWidget(page, 'Bolle', 100, 400);
    await bubbles.getByRole('button', { name: 'Scoppia la bolla' }).first().click();
    await expect(bubbles.locator('.todo-foot')).toContainText('47 rimaste');

    await reload(page);
    const all = page.locator('.canvas .widget');
    await expect(all.locator('.habit-cell.on')).toHaveCount(1);
    await expect(all.locator('.counter-value')).toContainText('3');
    await expect(all.locator('.cal-day.marked')).toHaveCount(1);
    await expect(all.locator('.bubble.popped')).toHaveCount(1);
  });

  test('dadi: il lancio usa il generatore casuale e mostra il totale', async ({ page }) => {
    await page.addInitScript(() => { Math.random = () => 0.5; });
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    const w = await addWidget(page, 'Dadi');
    await w.getByRole('button', { name: 'Lancia', exact: true }).click();
    await expect(w.locator('.die')).toHaveText(['4', '4']); // 1 + floor(0.5 * 6), per due dadi
    await expect(w).toContainText('Totale 8');
  });
});
