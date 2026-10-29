import { expect, test } from '@playwright/test';
import { addWidget, appData, openApp, seed, widgetAt } from './helpers';

test.describe('tool ritratti sopra i widget', () => {
  test('un widget sotto la barra fa rientrare i tool che gli stanno sopra, e solo quelli', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([widgetAt('a', 'postit', 0, 0)], { tilt: false }));
    const retracted = page.locator('.drawer-item.retracted');
    await expect(retracted.first()).toBeVisible();
    const total = await page.locator('.drawer-item').count();
    expect(await retracted.count()).toBeLessThan(total);

    // Il pulsante × del widget in alto a sinistra è cliccabile e rimuove il widget.
    await page.locator('.canvas .widget').getByRole('button', { name: 'Remove widget' }).click({ timeout: 3000 });
    await expect(page.locator('.canvas .widget')).toHaveCount(0);
    await expect(retracted).toHaveCount(0);
  });

  test('scorrendo la barra il rientro passa ai tool che arrivano sopra il widget', async ({ page }) => {
    await page.setViewportSize({ width: 560, height: 700 });
    await openApp(page);
    await seed(page, appData([widgetAt('a', 'postit', 0, 0)], { tilt: false }));
    const names = () => page.locator('.drawer-item.retracted').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).join('|'));
    const before = await names();
    await page.locator('.drawer-track').evaluate((t) => { t.scrollLeft = 400; });
    await expect.poll(names).not.toBe(before);
  });
});

test.describe('widget aggiuntivi', () => {
  test('promemoria: aggiunge e toglie una voce', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Reminders');
    await w.getByLabel('Text').fill('chiamare Anna');
    await w.getByLabel('When').fill('2030-05-01T09:30');
    await w.getByRole('button', { name: 'Add' }).click();
    await expect(w.locator('.todo-list li')).toContainText('chiamare Anna');
    await w.getByRole('button', { name: 'Delete' }).click();
    await expect(w.locator('.todo-list li')).toHaveCount(0);
  });

  test('conto alla rovescia: mostra i giorni che mancano', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Countdown');
    await w.getByLabel('Date').fill('2026-11-02T12:00');
    await expect(w.locator('.countdown-value b').first()).toHaveText('5');
  });

  test('bacheca: la carta passa da una colonna all’altra e resta dopo il ricaricamento', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Board');
    await w.getByLabel('New card').fill('scrivere i test');
    await w.getByLabel('New card').press('Enter');
    await w.getByRole('button', { name: 'Move right' }).click();
    await expect(w.getByRole('region', { name: 'In progress' })).toContainText('scrivere i test');
    await page.waitForTimeout(600);
    await page.reload();
    await expect(page.getByRole('region', { name: 'In progress' })).toContainText('scrivere i test');
  });

  test('spese e dividi il conto fanno i conti', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const s = await addWidget(page, 'Expenses', 300, 250);
    await s.getByLabel('Amount').fill('20');
    await s.getByRole('button', { name: '+ Income' }).click();
    await s.getByLabel('Amount').fill('7.5');
    await s.getByRole('button', { name: '− Expense' }).click();
    await expect(s.getByLabel('Balance')).toContainText('12.50');

    const d = await addWidget(page, 'Split the bill', 700, 250);
    await d.getByLabel('Total').fill('90');
    await d.getByLabel('people').fill('3');
    await expect(d.locator('.counter-value')).toContainText('30.00');
  });

  test('umore e pianta: si segnano per oggi', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const m = await addWidget(page, 'Mood', 300, 250);
    await m.getByRole('button', { name: 'Mood 5 of 5' }).click();
    await expect(m.getByRole('button', { name: 'Mood 5 of 5' })).toHaveAttribute('aria-pressed', 'true');

    const p = await addWidget(page, 'Plant', 700, 250);
    await p.getByRole('button', { name: 'Water it' }).click();
    await expect(p.getByRole('button', { name: /Watered today/ })).toBeDisabled();
  });

  test('2048 con le frecce, tris e memory si giocano', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const g = await addWidget(page, '2048', 250, 250);
    const tiles = () => g.locator('.t').evaluateAll((els) => els.filter((e) => e.textContent).length);
    expect(await tiles()).toBe(2);
    const grid = g.getByRole('application');
    await grid.focus();
    for (const k of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']) await grid.press(k);
    expect(await tiles()).toBeGreaterThanOrEqual(2);
    await expect(g.locator('.g2048-head')).toContainText('Score');

    const t = await addWidget(page, 'Tic-tac-toe', 600, 250);
    for (const i of [1, 4, 2, 5, 3]) await t.getByRole('button', { name: new RegExp(`^Square ${i}\\b`) }).click();
    await expect(t).toContainText('X wins');

    const m = await addWidget(page, 'Memory', 950, 250);
    await m.getByRole('button', { name: 'Face-down card' }).first().click();
    await expect(m.getByRole('button', { name: 'Face-down card' })).toHaveCount(15);
  });

  test('ruota della fortuna estrae una delle opzioni', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Wheel of fortune');
    await w.getByRole('button', { name: 'Spin' }).click();
    await expect(w.locator('.wheel-result')).toContainText(/Pizza|Sushi|Salad|Pasta/, { timeout: 6000 });
  });
});
