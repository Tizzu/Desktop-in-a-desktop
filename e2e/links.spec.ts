import { expect, test, type Page } from '@playwright/test';
import { appData, dragToolTo, dragWidget, openApp, position, readSaved, seed, widgetAt, widgets } from './helpers';

// Due widget da 260x200 sulla tela, coordinate rispetto al centro (vedi helpers: appData).
const two = (gap: number, extra: Record<string, unknown>[] = []) => [widgetAt('a', 'postit', -400, -100), widgetAt('b', 'postit', -400 + 260 + gap, -100), ...extra];

const open = async (page: Page, list: unknown[], settings: Record<string, unknown> = {}) => {
  await openApp(page);
  await seed(page, { ...appData(list, settings), version: 3 });
};

const saved = async (page: Page) => {
  await page.waitForTimeout(600);
  return (await readSaved(page)).workspaces[0];
};

test('avvicinando un bordo all\'altro i widget si agganciano e si muovono insieme', async ({ page }) => {
  await open(page, two(30), { tilt: false, physics: false });
  const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
  await dragWidget(page, b, -22, 0); // il gap da 30px scende a 8: entro la soglia di aggancio
  expect((await position(b)).x - (await position(a)).x).toBe(260); // lati combacianti
  expect((await saved(page)).links).toEqual([['b', 'a']]);
  await expect(page.locator('.link-spot')).toHaveCount(1);

  const before = [await position(a), await position(b)];
  await dragWidget(page, a, 100, 60); // basta una qualunque delle due barre
  const after = [await position(a), await position(b)];
  expect(after[0]!.x - before[0]!.x).toBe(100);
  expect(after[1]!.x - before[1]!.x).toBe(100);
  expect(after[1]!.y - before[1]!.y).toBe(60);
});

test('lontani non si agganciano; con Alt nemmeno se vicini', async ({ page }) => {
  await open(page, two(80), { tilt: false, physics: false });
  await dragWidget(page, widgets(page).nth(1), -20, 0);
  expect((await saved(page)).links ?? []).toEqual([]);

  await page.keyboard.down('Alt');
  await dragWidget(page, widgets(page).nth(1), -55, 0); // arriva a 5px dall'altro
  await page.keyboard.up('Alt');
  expect((await saved(page)).links ?? []).toEqual([]);
});

test('il punto di attacco ha un bottone per sganciare; poi si può trascinare via senza riagganciarsi', async ({ page }) => {
  await open(page, two(30), { tilt: false, physics: false });
  // Il seed non contiene l'aggancio: lo creiamo con un gesto.
  await dragWidget(page, widgets(page).nth(1), -22, 0);
  await expect(page.locator('.link-spot')).toHaveCount(1);

  const spot = page.locator('.link-spot');
  const at = (await spot.boundingBox())!;
  await page.mouse.move(at.x, at.y);
  const btn = page.getByRole('button', { name: 'Detach widgets' });
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(spot).toHaveCount(0);

  const a0 = await position(widgets(page).nth(0));
  await dragWidget(page, widgets(page).nth(1), 3, 0); // ancora a contatto: non deve riagganciarsi
  await expect(spot).toHaveCount(0);
  await dragWidget(page, widgets(page).nth(1), 150, 0);
  expect(await position(widgets(page).nth(0))).toEqual(a0); // l'altro è rimasto fermo
});

test('un gruppo agganciato resta insieme quando la finestra si restringe', async ({ page }) => {
  await open(page, [widgetAt('a', 'postit', -100, -100), widgetAt('b', 'postit', 190, -100)], { tilt: false, physics: false });
  await dragWidget(page, widgets(page).nth(1), -20, 0);
  await page.setViewportSize({ width: 560, height: 700 });
  await expect.poll(async () => {
    const [pa, pb] = [await position(widgets(page).nth(0)), await position(widgets(page).nth(1))];
    return [pb.x - pa.x, pb.x + 260 <= 560 + 0.5];
  }).toEqual([260, true]);
});

test('contenitore: ci si lasciano dentro i widget, che seguono il contenitore e se ne possono togliere', async ({ page }) => {
  await open(page, [widgetAt('box', 'container', -300, -200), widgetAt('n', 'postit', 200, -150)].map((w, i) => (i === 0 ? { ...w, w: 460, h: 340 } : w)), { tilt: false, physics: false });
  const box = widgets(page).nth(0);
  const note = widgets(page).nth(1);
  await expect(box).toHaveAttribute('data-empty', '');

  // Dentro: il widget lasciato sopra il corpo del contenitore ne diventa figlio.
  await dragWidget(page, note, -380, 120);
  await expect(box).not.toHaveAttribute('data-empty', '');
  let s = await saved(page);
  expect(s.widgets.find((w: any) => w.id === 'n').parent).toBe('box');

  // Segue il contenitore.
  const rel = async () => {
    const [bb, nb] = [(await box.boundingBox())!, (await note.boundingBox())!];
    return [Math.round(nb.x - bb.x), Math.round(nb.y - bb.y)];
  };
  const r0 = await rel();
  await dragWidget(page, box, 60, 40);
  expect(await rel()).toEqual(r0);

  // Fuori: trascinato lontano torna libero sulla tela.
  await dragWidget(page, note, 300, 0);
  await expect(box).toHaveAttribute('data-empty', '');
  s = await saved(page);
  expect(s.widgets.find((w: any) => w.id === 'n').parent).toBeUndefined();
});

test('contenitore: dal cassetto il widget entra direttamente; rimuovendolo i suoi widget non si perdono', async ({ page }) => {
  await open(page, [{ ...widgetAt('box', 'container', -300, -50), w: 460, h: 300 }], { tilt: false, physics: false });
  const box = widgets(page).nth(0);
  const b = (await box.boundingBox())!;
    await dragToolTo(page, 'Sticky note', b.x + 230, b.y + 150);
  await expect(widgets(page)).toHaveCount(2);
  expect((await saved(page)).widgets.find((w: any) => w.type === 'postit').parent).toBe('box');

  await box.getByRole('button', { name: 'Remove widget' }).click();
  await expect(widgets(page)).toHaveCount(1);
  expect((await saved(page)).widgets[0].parent).toBeUndefined();
});

test('contenitore: si chiude a una barra nascondendo i suoi widget, e riaprendolo tutto torna com\'era', async ({ page }) => {
  await open(page, [{ ...widgetAt('box', 'container', -300, -50), w: 460, h: 300 }, widgetAt('n', 'postit', -250, 20, { text: 'dentro' })], { tilt: false, physics: false });
  const box = widgets(page).nth(0);
  const note = widgets(page).nth(1);
  await dragWidget(page, note, 0, 0, 1); // un click sulla barra non deve toglierlo da lì
  await expect(box).not.toHaveAttribute('data-empty', '');
  const before = (await box.boundingBox())!;
  const noteBefore = (await note.boundingBox())!;

  await box.getByRole('button', { name: 'Close container' }).click();
  await expect(note).toBeHidden();
  await expect(box).toContainText('(1)');
  expect((await box.boundingBox())!.height).toBeLessThan(40);

  await box.getByRole('button', { name: 'Open container' }).click();
  await expect(note).toBeVisible();
  expect(await box.boundingBox()).toEqual(before);
  expect(await note.boundingBox()).toEqual(noteBefore);
  await expect(note.locator('textarea')).toHaveValue('dentro');
});
