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
    const w = await addWidget(page, 'Intervals');
    await w.getByLabel('work (s)').fill('10');
    await w.getByLabel('rest (s)').fill('5');
    await w.getByLabel('rounds').fill('2');
    await w.getByRole('button', { name: 'Start' }).click();
    await expect(w.locator('.timer-note')).toContainText('Work · round 1/2');
    await page.clock.runFor(12_000);
    await expect(w.locator('.timer-note')).toContainText('Rest');
    await page.clock.runFor(5_000);
    await expect(w.locator('.timer-note')).toContainText('Work · round 2/2');
    await page.clock.runFor(11_000);
    await expect(w.locator('.timer-note')).toContainText('Done!');
  });

  test('pausa occhi: conto alla pausa, poi guarda lontano e riparte da sola', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Eye break');
    await w.getByRole('button', { name: 'Start' }).click();
    await expect(w.locator('.timer-note')).toHaveText('Next break in');
    await page.clock.fastForward(20 * 60_000 + 1000);
    await page.clock.runFor(600);
    await expect(w.locator('.timer-note')).toContainText('Look into the distance');
    await page.clock.fastForward(21_000);
    await page.clock.runFor(600);
    await expect(w.locator('.timer-note')).toHaveText('Next break in');
  });

  test('agenda: la voce resta, il giorno dopo la pagina riparte vuota', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Agenda');
    await w.getByLabel('Hour 9').fill('dentist');
    await expect(w.getByLabel('Hour 9')).toHaveValue('dentist');
    await page.clock.fastForward(15 * 3600_000); // runFor farebbe scattare ogni orologio dei cassetti per ore
    await expect(w.getByLabel('Hour 9')).toHaveValue('');
  });

  test('diario e gratitudine: si scrive per oggi e si sfoglia il giorno prima', async ({ page }) => {
    await fresh(page);
    const d = await addWidget(page, 'Journal', 300, 250);
    await d.getByLabel('One line about the day 1').fill('giornata tranquilla');
    const g = await addWidget(page, 'Gratitude', 700, 250);
    await g.getByLabel('Today I am grateful for 2').fill('il caffè');
    await reload(page);
    await expect(page.locator('.canvas').getByLabel('One line about the day 1')).toHaveValue('giornata tranquilla');
    await expect(page.locator('.canvas').getByLabel('Today I am grateful for 2')).toHaveValue('il caffè');
    await page.locator('.canvas').getByRole('button', { name: 'Previous day' }).first().click();
    await expect(page.locator('.canvas').getByLabel('One line about the day 1')).toHaveValue('');
    await expect(page.locator('.canvas').getByRole('button', { name: 'Next day' }).first()).toBeEnabled();
  });

  test('schede di ripasso: gira, segna come note e ricomincia', async ({ page }) => {
    await fresh(page);
    const w = await addWidget(page, 'Flashcards');
    await w.getByLabel('Question').fill('capitale d’Italia');
    await w.getByLabel('Answer').fill('Rome');
    await w.getByRole('button', { name: 'Add' }).click();
    await w.getByRole('button', { name: /Review/ }).click();
    await expect(w.getByRole('button', { name: 'Flip the card' })).toHaveText('capitale d’Italia');
    await w.getByRole('button', { name: 'Flip the card' }).click();
    await expect(w.getByRole('button', { name: 'Flip the card' })).toHaveText('Rome');
    await w.getByRole('button', { name: 'I know it' }).click();
    await expect(w).toContainText('You know them all');
    await w.getByRole('button', { name: 'Start over' }).click();
    await expect(w.getByRole('button', { name: 'Flip the card' })).toBeVisible();
  });

  test('salvadanaio: versa, preleva senza scendere sotto zero e mostra cosa manca', async ({ page }) => {
    await fresh(page);
    const w = await addWidget(page, 'Piggy bank');
    await w.getByLabel('goal €').fill('100');
    await w.getByLabel('Amount').fill('30');
    await w.getByRole('button', { name: 'Deposit' }).click();
    await expect(w.locator('.counter-value')).toContainText('30.00');
    await expect(w).toContainText('to go');
    await w.getByLabel('Amount').fill('500');
    await w.getByRole('button', { name: 'Withdraw' }).click();
    await expect(w.locator('.counter-value')).toContainText('0.00');
  });

  test('sonno, serie di giorni, etichetta e cornice conservano lo stato', async ({ page }) => {
    await fresh(page);
    const s = await addWidget(page, 'Sleep', 250, 250);
    await s.getByRole('button', { name: 'More' }).click();
    await expect(s.locator('.sleep-now')).toHaveText('7.5 h');
    const k = await addWidget(page, 'Day streak', 600, 250);
    await k.getByLabel('Name').fill('caffè');
    await expect(k.locator('.counter-value')).toContainText('0');
    const l = await addWidget(page, 'Label', 950, 250);
    await l.getByLabel('Text').fill('Studio');
    await l.getByRole('button', { name: 'Larger' }).click({ force: true });
    const f = await addWidget(page, 'Frame', 250, 520);
    await f.getByRole('button', { name: 'Colour 3' }).click();
    await reload(page);
    await expect(page.locator('.canvas .sleep-now')).toHaveText('7.5 h');
    await expect(page.locator('.canvas').getByLabel('Name')).toHaveValue('caffè');
    await expect(page.locator('.canvas').getByLabel('Text')).toHaveValue('Studio');
    await expect(page.locator('.canvas').getByLabel('Text')).toHaveCSS('font-size', '38px');
    await expect(page.locator('.canvas').getByRole('button', { name: 'Colour 3' })).toHaveClass(/on/);
  });

  test('pioggia e caminetto si mostrano senza errori', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await fresh(page);
    await addWidget(page, 'Rain', 300, 250);
    await addWidget(page, 'Fireplace', 700, 250);
    await expect(page.getByRole('img', { name: 'Rain on the glass' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Fireplace, lit' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
