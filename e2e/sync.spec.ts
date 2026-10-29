import { expect, test } from '@playwright/test';
import { dragToolTo, dragWidget, openApp, position, settled, widgets } from './helpers';

test('due schede aperte restano allineate', async ({ context }) => {
  const a = await context.newPage();
  await openApp(a);
  const b = await context.newPage();
  await openApp(b);

  // Un widget creato in A compare in B.
  await dragToolTo(a, 'Post-it', 400, 250);
  await expect(widgets(a)).toHaveCount(1);
  await expect(widgets(b)).toHaveCount(1);

  // Spostarlo in B lo sposta anche in A.
  await dragWidget(b, widgets(b).first(), 120, 60);
  await settled(widgets(b).first());
  const inB = await position(widgets(b).first());
  await expect.poll(async () => (await position(widgets(a).first())).x).toBeCloseTo(inB.x, 0);
  await expect.poll(async () => (await position(widgets(a).first())).y).toBeCloseTo(inB.y, 0);

  // Scrivere in A appare in B.
  await widgets(a).first().locator('textarea').fill('ciao da A');
  await expect(widgets(b).first().locator('textarea')).toHaveValue('ciao da A');

  // Eliminarlo in B lo elimina in A.
  await widgets(b).first().getByRole('button', { name: 'Rimuovi widget' }).click();
  await expect(widgets(a)).toHaveCount(0);
});

test('ogni scheda guarda lo spazio che vuole, ma la lista degli spazi è condivisa', async ({ context }) => {
  const a = await context.newPage();
  await openApp(a);
  const b = await context.newPage();
  await openApp(b);

  await a.getByRole('button', { name: 'Nuovo spazio' }).click(); // A passa allo spazio 2
  await expect(a.locator('.tab.active')).toContainText('Spazio 2');
  await expect(b.getByRole('button', { name: 'Spazio 2', exact: true })).toBeVisible(); // B lo vede...
  await expect(b.locator('.tab.active')).toContainText('Spazio 1'); // ...ma resta dov'era

  await dragToolTo(a, 'Taccuino', 400, 250); // in A, spazio 2
  await expect(widgets(a)).toHaveCount(1);
  await expect(widgets(b)).toHaveCount(0); // B guarda lo spazio 1: nessun widget
  await b.getByRole('button', { name: 'Spazio 2', exact: true }).click();
  await expect(widgets(b)).toHaveCount(1);
  await expect(widgets(b).first().locator('.widget-bar')).toContainText('Taccuino');
});

test('una scheda aperta subito dopo una modifica riceve lo stato aggiornato', async ({ context }) => {
  const a = await context.newPage();
  await openApp(a);
  await dragToolTo(a, 'Post-it', 400, 250);
  await widgets(a).first().locator('textarea').fill('appena scritto');

  const c = await context.newPage(); // aperta prima che il salvataggio (300 ms) sia completato
  await openApp(c);
  await expect(widgets(c)).toHaveCount(1);
  await expect(widgets(c).first().locator('textarea')).toHaveValue('appena scritto');
});

test('le impostazioni condivise si propagano, quelle locali no', async ({ context }) => {
  const a = await context.newPage();
  await openApp(a);
  const b = await context.newPage();
  await openApp(b);

  await a.getByRole('button', { name: 'Impostazioni' }).click();
  await a.getByRole('radio', { name: 'Mare' }).click();
  await expect(b.locator('html')).toHaveAttribute('data-theme', 'sea');

  await a.getByRole('tab', { name: 'Tempo' }).click(); // cassetto aperto: solo in questa scheda
  await expect(a.locator('.cat.on')).toHaveAttribute('title', 'Tempo');
  await expect(b.locator('.cat.on')).toHaveAttribute('title', 'Tutti');
});
