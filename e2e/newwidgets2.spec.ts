import { expect, test, type Page } from '@playwright/test';
import { addWidget, appData, openApp, seed } from './helpers';

const fresh = async (page: Page) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
};
const reload = async (page: Page) => {
  await page.waitForTimeout(600); // autosave con debounce
  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
};

test.describe('widget aggiuntivi (2)', () => {
  test('intervalli: alterna lavoro e recupero fino alla fine', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Intervalli');
    await w.getByLabel('lavoro (s)').fill('10');
    await w.getByLabel('recupero (s)').fill('5');
    await w.getByLabel('giri').fill('2');
    await w.getByRole('button', { name: 'Avvia' }).click();
    await expect(w.locator('.timer-note')).toContainText('Lavoro · giro 1/2');
    await page.clock.runFor(12_000);
    await expect(w.locator('.timer-note')).toContainText('Recupero');
    await page.clock.runFor(5_000);
    await expect(w.locator('.timer-note')).toContainText('Lavoro · giro 2/2');
    await page.clock.runFor(11_000);
    await expect(w.locator('.timer-note')).toContainText('Fatto!');
  });

  test('pausa occhi: conto alla pausa, poi guarda lontano e riparte da sola', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Pausa occhi');
    await w.getByRole('button', { name: 'Avvia' }).click();
    await expect(w.locator('.timer-note')).toHaveText('Prossima pausa tra');
    await page.clock.fastForward(20 * 60_000 + 1000);
    await page.clock.runFor(600);
    await expect(w.locator('.timer-note')).toContainText('Guarda lontano');
    await page.clock.fastForward(21_000);
    await page.clock.runFor(600);
    await expect(w.locator('.timer-note')).toHaveText('Prossima pausa tra');
  });

  test('agenda: la voce resta, il giorno dopo la pagina riparte vuota', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Agenda');
    await w.getByLabel('Ore 9').fill('dentista');
    await expect(w.getByLabel('Ore 9')).toHaveValue('dentista');
    await page.clock.fastForward(15 * 3600_000); // runFor farebbe scattare ogni orologio dei cassetti per ore
    await expect(w.getByLabel('Ore 9')).toHaveValue('');
  });

  test('diario e gratitudine: si scrive per oggi e si sfoglia il giorno prima', async ({ page }) => {
    await fresh(page);
    const d = await addWidget(page, 'Diario', 300, 250);
    await d.getByLabel('Una riga sulla giornata 1').fill('giornata tranquilla');
    const g = await addWidget(page, 'Gratitudine', 700, 250);
    await g.getByLabel('Oggi sono grato per 2').fill('il caffè');
    await reload(page);
    await expect(page.locator('.canvas').getByLabel('Una riga sulla giornata 1')).toHaveValue('giornata tranquilla');
    await expect(page.locator('.canvas').getByLabel('Oggi sono grato per 2')).toHaveValue('il caffè');
    await page.locator('.canvas').getByRole('button', { name: 'Giorno prima' }).first().click();
    await expect(page.locator('.canvas').getByLabel('Una riga sulla giornata 1')).toHaveValue('');
    await expect(page.locator('.canvas').getByRole('button', { name: 'Giorno dopo' }).first()).toBeEnabled();
  });

  test('schede di ripasso: gira, segna come note e ricomincia', async ({ page }) => {
    await fresh(page);
    const w = await addWidget(page, 'Schede di ripasso');
    await w.getByLabel('Domanda').fill('capitale d’Italia');
    await w.getByLabel('Risposta').fill('Roma');
    await w.getByRole('button', { name: 'Aggiungi' }).click();
    await w.getByRole('button', { name: /Ripassa/ }).click();
    await expect(w.getByRole('button', { name: 'Gira la scheda' })).toHaveText('capitale d’Italia');
    await w.getByRole('button', { name: 'Gira la scheda' }).click();
    await expect(w.getByRole('button', { name: 'Gira la scheda' })).toHaveText('Roma');
    await w.getByRole('button', { name: 'Lo so' }).click();
    await expect(w).toContainText('Le sai tutte');
    await w.getByRole('button', { name: 'Ricomincia' }).click();
    await expect(w.getByRole('button', { name: 'Gira la scheda' })).toBeVisible();
  });

  test('salvadanaio: versa, preleva senza scendere sotto zero e mostra cosa manca', async ({ page }) => {
    await fresh(page);
    const w = await addWidget(page, 'Salvadanaio');
    await w.getByLabel('obiettivo €').fill('100');
    await w.getByLabel('Importo').fill('30');
    await w.getByRole('button', { name: 'Versa' }).click();
    await expect(w.locator('.counter-value')).toContainText('30,00');
    await expect(w).toContainText('ne mancano');
    await w.getByLabel('Importo').fill('500');
    await w.getByRole('button', { name: 'Preleva' }).click();
    await expect(w.locator('.counter-value')).toContainText('0,00');
  });

  test('sonno, serie di giorni, etichetta e cornice conservano lo stato', async ({ page }) => {
    await fresh(page);
    const s = await addWidget(page, 'Sonno', 250, 250);
    await s.getByRole('button', { name: 'Più' }).click();
    await expect(s.locator('.sleep-now')).toHaveText('7.5 h');
    const k = await addWidget(page, 'Serie di giorni', 600, 250);
    await k.getByLabel('Nome').fill('caffè');
    await expect(k.locator('.counter-value')).toContainText('0');
    const l = await addWidget(page, 'Etichetta', 950, 250);
    await l.getByLabel('Testo').fill('Studio');
    await l.getByRole('button', { name: 'Più grande' }).click({ force: true });
    const f = await addWidget(page, 'Cornice', 250, 520);
    await f.getByRole('button', { name: 'Colore 3' }).click();
    await reload(page);
    await expect(page.locator('.canvas .sleep-now')).toHaveText('7.5 h');
    await expect(page.locator('.canvas').getByLabel('Nome')).toHaveValue('caffè');
    await expect(page.locator('.canvas').getByLabel('Testo')).toHaveValue('Studio');
    await expect(page.locator('.canvas').getByLabel('Testo')).toHaveCSS('font-size', '38px');
    await expect(page.locator('.canvas').getByRole('button', { name: 'Colore 3' })).toHaveClass(/on/);
  });

  test('pioggia e caminetto si mostrano senza errori', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await fresh(page);
    await addWidget(page, 'Pioggia', 300, 250);
    await addWidget(page, 'Caminetto', 700, 250);
    await expect(page.getByRole('img', { name: 'Pioggia sul vetro' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Caminetto acceso' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
