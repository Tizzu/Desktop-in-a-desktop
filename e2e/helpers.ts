import { expect, type Locator, type Page } from '@playwright/test';

export const widgets = (page: Page) => page.locator('.canvas .widget');

export async function openApp(page: Page) {
  await page.goto('/newtab.html');
  await page.locator('.drawer-item').first().waitFor();
}

/** Trascina un tool dal cassetto fino al punto (x, y) della finestra e lo lascia lì. */
export async function dragToolTo(page: Page, label: string, x: number, y: number) {
  const tool = page.locator(`.drawer-item[aria-label="${label}"] .tool`);
  await tool.scrollIntoViewIfNeeded();
  const box = (await tool.boundingBox())!;
  // La parte alta del tool è nascosta dietro la barra: si afferra quella che sporge sotto.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 14);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

export const position = (w: Locator) =>
  w.evaluate((el) => ({ x: parseFloat((el as HTMLElement).style.left), y: parseFloat((el as HTMLElement).style.top) }));

/** Trascina un widget dalla sua barra del titolo, di (dx, dy). */
export async function dragWidget(page: Page, w: Locator, dx: number, dy: number, steps = 8) {
  const box = (await w.locator('.widget-bar').boundingBox())!;
  const sx = box.x + 40, sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + dx, sy + dy, { steps });
  await page.mouse.up();
}

/** Aspetta che la posizione di un widget smetta di cambiare (fine del lancio con inerzia). */
export async function settled(w: Locator) {
  let prev = JSON.stringify(await position(w));
  await expect
    .poll(async () => {
      await w.page().waitForTimeout(150);
      const now = JSON.stringify(await position(w));
      const same = now === prev;
      prev = now;
      return same;
    }, { timeout: 8000 })
    .toBe(true);
}

// --- Dati di partenza scritti direttamente nel database, per provare casi che a mano sono scomodi ---

export const DEFAULT_SETTINGS = { tilt: true, physics: true, drawerStyle: 'tucked', categories: true, searchBar: false, theme: 'warm', activeCategory: 'all' };

export function appData(widgetList: unknown[], settings: Record<string, unknown> = {}) {
  return {
    version: 2,
    activeWorkspaceId: 'w',
    settings: { ...DEFAULT_SETTINGS, ...settings },
    workspaces: [{ id: 'w', name: 'Spazio 1', order: 0, widgets: widgetList }],
  };
}

export const widgetAt = (id: string, type: string, x: number, y: number, state: unknown = {}) =>
  ({ id, type, x, y, w: 260, h: 200, z: 1, rot: 0, state });

/** Scrive `data` nel database (che l'app ha già creato aprendosi) e ricarica la pagina. */
export async function seed(page: Page, data: unknown) {
  await page.evaluate(
    (d) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('desktop-in-a-desktop', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('app', 'readwrite');
          tx.objectStore('app').put(d, 'data');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    data,
  );
  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
}

/** Legge cosa c'è salvato nel database. */
export const readSaved = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const open = indexedDB.open('desktop-in-a-desktop', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction('app').objectStore('app').get('data');
          get.onsuccess = () => resolve(get.result);
        };
      }),
  );

/** Trascina un tool nel punto (x, y) della finestra e restituisce il widget creato. */
export async function addWidget(page: Page, label: string, x = 420, y = 260) {
  const before = await widgets(page).count();
  await dragToolTo(page, label, x, y);
  await expect(widgets(page)).toHaveCount(before + 1);
  return widgets(page).nth(before);
}
