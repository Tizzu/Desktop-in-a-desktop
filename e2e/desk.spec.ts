import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_SETTINGS, answer, confirmBox, openApp, openSettings, closeSettings, position, readSaved, seed, widgetAt, widgets, dragWidget } from './helpers';

// Dati nella versione corrente (coordinate rispetto al centro), con più spazi se serve.
const desk = (spaces: { id: string; name: string; widgets: unknown[] }[], settings: Record<string, unknown> = {}) => ({
  version: 3,
  activeWorkspaceId: spaces[0]!.id,
  settings: { ...DEFAULT_SETTINGS, physics: false, ...settings },
  workspaces: spaces.map((s, i) => ({ ...s, order: i, links: [] })),
});
const postit = (id: string, text: string, x = -150, y = -100) => widgetAt(id, 'postit', x, y, { text });

async function start(page: Page, data: ReturnType<typeof desk>) {
  await openApp(page);
  await seed(page, data);
}
const optionsOf = (page: Page, index = 0) => widgets(page).nth(index).getByRole('button', { name: 'Widget options' });

test.describe('annulla, ripeti e avviso di rimozione', () => {
  test('rimuovere un widget mostra un avviso: «Annulla» lo rimette con il suo contenuto', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'da non perdere')] }]));
    await widgets(page).first().getByLabel('Remove widget').click();
    await expect(widgets(page)).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Widget removed');
    await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
    await expect(widgets(page)).toHaveCount(1);
    await expect(widgets(page).first().locator('textarea')).toHaveValue('da non perdere');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('Ctrl+Z riporta il widget dove stava e Ctrl+Maiusc+Z lo rimette dove l\'avevi messo', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'x')] }]));
    const w = widgets(page).first();
    const before = await position(w);
    await dragWidget(page, w, 120, 90);
    const after = await position(w);
    expect(after.x).toBeGreaterThan(before.x + 50);
    await page.keyboard.press('Control+z');
    await expect.poll(() => position(w)).toEqual(before);
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(() => position(w)).toEqual(after);
  });

  test('mentre si scrive in un campo, Ctrl+Z resta del testo e non annulla la scrivania', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'x'), postit('q', 'y', 200, 100)] }]));
    await dragWidget(page, widgets(page).first(), 100, 0);
    const moved = await position(widgets(page).first());
    await widgets(page).nth(1).locator('textarea').click();
    await page.keyboard.press('Control+z');
    await expect.poll(() => position(widgets(page).first())).toEqual(moved);
  });
});

test.describe('menu del widget', () => {
  test('duplica: la copia ha lo stesso contenuto', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'doppio')] }]));
    await optionsOf(page).click();
    await page.getByRole('menuitem', { name: /Duplicate/ }).click();
    await expect(widgets(page)).toHaveCount(2);
    await expect(widgets(page).nth(1).locator('textarea')).toHaveValue('doppio');
    await page.keyboard.press('Control+z');
    await expect(widgets(page)).toHaveCount(1);
  });

  test('colore della barra: si sceglie, si salva e si toglie', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'x')] }]));
    await optionsOf(page).click();
    await page.getByRole('radio', { name: 'Blue' }).click();
    await expect(widgets(page).first().locator('.widget-bar')).toHaveAttribute('data-tint', 'blue');
    await page.waitForTimeout(600);
    expect((await readSaved(page)).workspaces[0].widgets[0].tint).toBe('blue');
    await page.reload();
    await expect(widgets(page).first().locator('.widget-bar')).toHaveAttribute('data-tint', 'blue');
    await optionsOf(page).click();
    await page.getByRole('radio', { name: 'No colour' }).click();
    await expect(widgets(page).first().locator('.widget-bar')).not.toHaveAttribute('data-tint', /./);
  });

  test('sposta in un altro spazio', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'viaggiatore')] }, { id: 'b', name: 'Lavoro', widgets: [] }]));
    await optionsOf(page).click();
    await page.getByRole('menuitem', { name: /→ Lavoro/ }).click();
    await expect(widgets(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Lavoro', exact: true }).click();
    await expect(widgets(page)).toHaveCount(1);
    await expect(widgets(page).first().locator('textarea')).toHaveValue('viaggiatore');
  });

  test('con un solo spazio non c\'è «Move to space»', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'x')] }]));
    await optionsOf(page).click();
    await expect(page.getByRole('menuitem', { name: /Duplicate/ })).toBeVisible();
    await expect(page.getByText('Move to space')).toHaveCount(0);
  });
});

test.describe('cestino', () => {
  test('un widget rimosso si rimette dalle impostazioni, anche dopo aver ricaricato', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'ritorno')] }]));
    await widgets(page).first().getByLabel('Remove widget').click();
    await expect(widgets(page)).toHaveCount(0);
    await page.waitForTimeout(600);
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await openSettings(page, 'Data');
    await page.getByRole('button', { name: 'Restore' }).click();
    await closeSettings(page);
    await expect(widgets(page)).toHaveCount(1);
    await expect(widgets(page).first().locator('textarea')).toHaveValue('ritorno');
    await openSettings(page, 'Data');
    await expect(page.getByRole('button', { name: 'Restore' })).toHaveCount(0);
  });
});

test.describe('palette dei comandi e scorciatoie', () => {
  const two = () => desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'niente')] }, { id: 'b', name: 'Lavoro', widgets: [postit('q', 'comprare zucchine')] }]);

  test('Ctrl+K trova un widget in un altro spazio e ci porta lì', async ({ page }) => {
    await start(page, two());
    await page.keyboard.press('Control+Shift+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await palette.getByRole('combobox').fill('ZUCCHINE');
    await expect(palette.getByRole('option').first()).toContainText('zucchine');
    await page.keyboard.press('Enter');
    await expect(palette).toHaveCount(0);
    await expect(page.locator('.tab.active')).toContainText('Lavoro');
    await expect(widgets(page).first()).toHaveClass(/found/);
  });

  test('aggiunge un tool e cambia spazio, e si chiude con Esc', async ({ page }) => {
    await start(page, two());
    await page.keyboard.press('Control+Shift+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await palette.getByRole('combobox').fill('stopwatch');
    await page.keyboard.press('Enter');
    await expect(widgets(page)).toHaveCount(2);
    await page.keyboard.press('Control+Shift+k');
    await palette.getByRole('combobox').fill('lavoro');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tab.active')).toContainText('Lavoro');
    await page.keyboard.press('Control+Shift+k');
    await page.keyboard.press('Escape');
    await expect(palette).toHaveCount(0);
  });

  test('Alt+numero cambia spazio', async ({ page }) => {
    await start(page, two());
    await page.keyboard.press('Alt+2');
    await expect(page.locator('.tab.active')).toContainText('Lavoro');
    await page.keyboard.press('Alt+1');
    await expect(page.locator('.tab.active')).toContainText('Space 1');
  });

  test('la scorciatoia della palette si cambia nelle impostazioni', async ({ page }) => {
    await start(page, two());
    await openSettings(page, 'Desk');
    await page.locator('.shortcut-row', { hasText: 'Command palette shortcut' }).getByRole('button').click();
    await page.keyboard.press('Alt+p');
    await closeSettings(page);
    await page.keyboard.press('Control+Shift+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
    await page.keyboard.press('Alt+p');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  });
});

test.describe('modelli di spazio', () => {
  const plus = (page: Page) => page.getByRole('button', { name: 'New space', exact: true });
  const openList = async (page: Page) => {
    await page.mouse.move(640, 300); // il riquadro compare quando il mouse ARRIVA sul ＋
    await expect(page.locator('.newspace-pop')).toHaveCount(0); // e quello di prima si è chiuso (dopo una breve attesa)
    await plus(page).hover();
    await page.getByRole('menuitem', { name: /From a template/ }).click();
  };
  const empty = () => desk([{ id: 'a', name: 'Space 1', widgets: [] }]);
  // Uno spazio con un contenitore (con un'attività dentro), una lista e un post-it, due dei quali agganciati.
  const furnished = () => {
    const data = desk([{
      id: 'a', name: 'Space 1',
      widgets: [
        widgetAt('c', 'container', -450, -150, { label: 'Lavoro' }),
        { ...widgetAt('t', 'todo', 10, 10, { items: [{ id: 'i1', text: 'chiamare Anna', done: false }] }), parent: 'c' },
        widgetAt('n', 'postit', 150, -150, { text: 'appunto privato' }),
      ],
    }]);
    return data;
  };

  test('passando sul ＋ compare il riquadro con «Blank» e «From a template»; un clic sul ＋ crea ancora uno spazio vuoto', async ({ page }) => {
    await start(page, empty());
    await plus(page).hover();
    await expect(page.getByRole('menuitem', { name: 'Blank' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /From a template/ })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Blank' }).click();
    await expect(page.locator('.tab')).toHaveCount(2);
    await expect(page.getByRole('menuitem', { name: 'Blank' })).toHaveCount(0);
    await page.mouse.move(600, 300); // via dal ＋
    await plus(page).click();
    await expect(page.locator('.tab')).toHaveCount(3);
    await page.mouse.move(600, 300);
    await expect(page.getByRole('menuitem', { name: 'Blank' })).toHaveCount(0); // il riquadro sparisce da solo
  });

  test('«From a template» elenca i modelli: uno di serie crea uno spazio già pieno di widget', async ({ page }) => {
    await start(page, empty());
    await openList(page);
    for (const name of ['Study day', 'Planning', 'Wellbeing', 'Deep focus']) await expect(page.getByRole('menuitem', { name: new RegExp(name) })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Study day/ })).toContainText('5 widgets');
    await page.getByRole('menuitem', { name: /Study day/ }).click();
    await expect(page.locator('.tab.active')).toContainText('Study day');
    await expect(widgets(page)).toHaveCount(5);
    await page.keyboard.press('Alt+1');
    await expect(widgets(page)).toHaveCount(0);
  });

  test('un modello di serie si toglie (senza domande) e si rimette dalle impostazioni', async ({ page }) => {
    await start(page, empty());
    await openList(page);
    await page.getByRole('button', { name: 'Delete template Planning' }).click();
    await expect(page.getByRole('menuitem', { name: /Planning/ })).toHaveCount(0);
    await expect(confirmBox(page)).toHaveCount(0);
    await page.waitForTimeout(600);
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await openList(page);
    await expect(page.getByRole('menuitem', { name: /Planning/ })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /Wellbeing/ })).toBeVisible();

    await openSettings(page, 'Data');
    await page.getByRole('button', { name: 'Restore the default templates (1)' }).click();
    await expect(page.getByRole('button', { name: 'All the default templates are available' })).toBeDisabled();
    await closeSettings(page);
    await openList(page);
    await expect(page.getByRole('menuitem', { name: /Planning/ })).toBeVisible();
  });

  test('tutti i modelli si possono togliere: resta il rimando alle impostazioni e si può ancora salvarne uno', async ({ page }) => {
    await start(page, furnished());
    await openList(page);
    for (const name of ['Study day', 'Planning', 'Wellbeing', 'Deep focus']) await page.getByRole('button', { name: `Delete template ${name}` }).click();
    await expect(page.getByText('No templates.')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Save this space as a template/ })).toBeEnabled();
  });

  test('salva lo spazio attuale come modello (senza contenuto) e lo riusa: struttura, nomi e agganci, widget vuoti', async ({ page }) => {
    await start(page, furnished());
    await openList(page);
    await page.getByRole('menuitem', { name: /Save this space as a template/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Save as a template' });
    await expect(dialog.getByLabel('Template name')).toHaveValue('Space 1');
    await dialog.getByLabel('Template name').fill('Il mio');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);

    await openList(page);
    await expect(page.getByRole('menuitem', { name: /Il mio/ })).toBeVisible();
    await page.getByRole('menuitem', { name: /Il mio/ }).click();
    await expect(page.locator('.tab.active')).toContainText('Il mio');
    await expect(widgets(page)).toHaveCount(3);
    await expect(widgets(page).filter({ hasText: 'Lavoro' })).toHaveCount(1); // il nome del contenitore resta
    await expect(page.locator('.todo-list li')).toHaveCount(0); // il contenuto no
    await expect(page.locator('.canvas .postit textarea')).toHaveValue('');
    // L'originale non è cambiato.
    await page.keyboard.press('Alt+1');
    await expect(page.locator('.todo-list li')).toHaveCount(1);
    // Il modello c'è anche nella palette.
    await page.keyboard.press('Control+Shift+k');
    await page.getByRole('combobox').fill('il mio');
    await expect(page.getByRole('option', { name: /New space: Il mio/ })).toBeVisible();
  });

  test('con «Also keep what is written» il modello tiene anche il contenuto', async ({ page }) => {
    await start(page, furnished());
    await openList(page);
    await page.getByRole('menuitem', { name: /Save this space as a template/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Save as a template' });
    await dialog.getByLabel('Template name').fill('Con testo');
    await dialog.getByLabel('Also keep what is written in the widgets').check();
    await page.keyboard.press('Enter'); // anche con Invio
    await expect(dialog).toHaveCount(0);
    await openList(page);
    await page.getByRole('menuitem', { name: /Con testo/ }).click();
    await expect(page.locator('.todo-list li')).toContainText('chiamare Anna');
    await expect(page.locator('.canvas .postit textarea')).toHaveValue('appunto privato');
  });

  test('un modello proprio si toglie dopo conferma; la finestra di salvataggio si chiude con Esc; sopra uno spazio vuoto non si può salvare', async ({ page }) => {
    await start(page, furnished());
    await openList(page);
    await page.getByRole('menuitem', { name: /Save this space as a template/ }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Save as a template' })).toHaveCount(0);
    await openList(page);
    await page.getByRole('menuitem', { name: /Save this space as a template/ }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await openList(page);
    await page.getByRole('button', { name: 'Delete template Space 1' }).click();
    await expect(confirmBox(page)).toContainText('Delete the template');
    await answer(page, false);
    await expect(page.getByRole('menuitem', { name: /Space 1/ })).toBeVisible();
    await page.getByRole('button', { name: 'Delete template Space 1' }).click();
    await answer(page, true);
    await expect(page.getByRole('menuitem', { name: /Space 1/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('menuitem', { name: 'Blank' }).click(); // un nuovo spazio, vuoto
    await openList(page);
    await expect(page.getByRole('menuitem', { name: /Save this space as a template/ })).toBeDisabled();
  });

  test('i modelli propri restano dopo aver ricaricato e viaggiano con l\'esportazione', async ({ page }) => {
    await start(page, furnished());
    await openList(page);
    await page.getByRole('menuitem', { name: /Save this space as a template/ }).click();
    await page.getByLabel('Template name').fill('Persistente');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(600);
    const saved = await readSaved(page);
    expect(saved.templates.map((t: { name: string }) => t.name)).toEqual(['Persistente']);
    expect(saved.templates[0].widgets).toHaveLength(3);
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await openList(page);
    await expect(page.getByRole('menuitem', { name: /Persistente/ })).toBeVisible();
  });
});

test.describe('spostare più widget in blocco', () => {
  const three = () => desk([{ id: 'a', name: 'Space 1', widgets: [widgetAt('a', 'postit', -400, -150), widgetAt('b', 'postit', -100, -150), widgetAt('c', 'postit', 300, 150)] }]);
  const choose = async (page: Page, ...indexes: number[]) => {
    for (const i of indexes) await widgets(page).nth(i).locator('.widget-bar').click({ modifiers: ['Control'], position: { x: 40, y: 10 } });
  };

  test('Ctrl+clic sulle barre sceglie i widget; trascinarne uno li sposta tutti insieme, e un solo Ctrl+Z li riporta', async ({ page }) => {
    await start(page, three());
    const before = await Promise.all([0, 1, 2].map((i) => position(widgets(page).nth(i))));
    await choose(page, 0, 1);
    const bar = page.getByRole('toolbar', { name: 'Selected widgets' });
    await expect(bar).toContainText('2 selected');
    await expect(widgets(page).first()).toHaveClass(/selected/);
    await dragWidget(page, widgets(page).nth(1), 60, 50);
    const after = await Promise.all([0, 1, 2].map((i) => position(widgets(page).nth(i))));
    expect(after[0]!.x - before[0]!.x).toBeCloseTo(60, 0);
    expect(after[0]!.y - before[0]!.y).toBeCloseTo(50, 0);
    expect(after[1]!.x - before[1]!.x).toBeCloseTo(60, 0);
    expect(after[1]!.y - before[1]!.y).toBeCloseTo(50, 0);
    expect(after[2]).toEqual(before[2]); // quello non scelto resta fermo
    await page.keyboard.press('Control+z');
    await expect.poll(() => Promise.all([0, 1, 2].map((i) => position(widgets(page).nth(i))))).toEqual(before);
  });

  test('senza scelta si muove un widget solo; Esc o un clic sulla tela vuota tolgono la scelta', async ({ page }) => {
    await start(page, three());
    await choose(page, 0, 1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('toolbar', { name: 'Selected widgets' })).toHaveCount(0);
    const [a, b] = await Promise.all([0, 1].map((i) => position(widgets(page).nth(i))));
    await dragWidget(page, widgets(page).nth(1), 60, 50);
    expect(await position(widgets(page).first())).toEqual(a);
    expect((await position(widgets(page).nth(1))).x).toBeGreaterThan(b!.x + 40);
    await choose(page, 0);
    await page.mouse.click(700, 520); // tela vuota
    await expect(page.getByRole('toolbar', { name: 'Selected widgets' })).toHaveCount(0);
  });

  test('dal menu ⋯ si sceglie un widget, e un widget fissato tra quelli scelti tiene fermo tutto', async ({ page }) => {
    const data = three();
    (data.workspaces[0]!.widgets[1] as { pinned?: boolean }).pinned = true;
    await start(page, data);
    await widgets(page).first().getByRole('button', { name: 'Widget options' }).click();
    await page.getByRole('menuitem', { name: /Select to move together/ }).click();
    await choose(page, 1);
    await expect(page.getByRole('toolbar', { name: 'Selected widgets' })).toContainText('2 selected');
    const before = await position(widgets(page).first());
    await dragWidget(page, widgets(page).first(), 60, 50);
    expect(await position(widgets(page).first())).toEqual(before);
  });
});

test.describe('avvisi di conferma dell\'app', () => {
  test('sono finestre dell\'app, non del browser: Esc annulla, la conferma procede, il focus parte su «Cancel»', async ({ page }) => {
    let native = '';
    page.on('dialog', (d) => { native = d.message(); void d.dismiss(); });
    const pinned = { ...postit('p', 'fissato'), pinned: true };
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [pinned] }]));
    const remove = widgets(page).first().getByLabel('Remove widget');
    await remove.click();
    const box = confirmBox(page);
    await expect(box).toContainText('pinned');
    await expect(box.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(box).toHaveCount(0);
    await expect(widgets(page)).toHaveCount(1);
    await remove.click();
    await box.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(widgets(page)).toHaveCount(0);
    expect(native).toBe('');
  });

  test('sopra le impostazioni: Esc chiude solo la domanda; un clic fuori annulla', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'x')] }]));
    await widgets(page).first().getByLabel('Remove widget').click();
    await openSettings(page, 'Data');
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await page.getByRole('button', { name: 'Empty the list' }).click();
    await expect(confirmBox(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirmBox(page)).toHaveCount(0);
    await expect(settings).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Empty the list' }).click();
    await page.mouse.click(5, 5); // sull'ombra attorno
    await expect(confirmBox(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Restore' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Empty the list' }).click();
    await answer(page, true);
    await expect(page.getByRole('button', { name: 'Restore' })).toHaveCount(0);
  });

  test('in italiano i pulsanti sono tradotti', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [{ ...postit('p', 'x'), pinned: true }] }], { language: 'it' }));
    await widgets(page).first().getByLabel('Rimuovi widget').click();
    await expect(confirmBox(page).getByRole('button', { name: 'Annulla' })).toBeVisible();
    await expect(confirmBox(page).getByRole('button', { name: 'Togli', exact: true })).toBeVisible();
  });
});

test.describe('barra di ricerca con la palette', () => {
  const withBar = () => desk([{ id: 'a', name: 'Space 1', widgets: [postit('p', 'niente')] }, { id: 'b', name: 'Lavoro', widgets: [postit('q', 'comprare zucchine')] }], { searchBar: true });
  const input = (page: Page) => page.locator('.fixed-search input');
  const menu = (page: Page) => page.getByRole('listbox');

  test('scrivendo propone la ricerca sul web e le voci della palette; con le frecce si sceglie e si esegue', async ({ page }) => {
    await start(page, withBar());
    await input(page).fill('zucch');
    await expect(menu(page)).toBeVisible();
    await expect(menu(page).getByRole('option').first()).toContainText('Search the web for “zucch”');
    await expect(menu(page).getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await expect(menu(page).getByRole('option', { name: /zucchine/ })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tab.active')).toContainText('Lavoro');
    await expect(widgets(page).first()).toHaveClass(/found/);
    await expect(menu(page)).toHaveCount(0);
    await expect(input(page)).toHaveValue('');
  });

  test('aggiunge un tool dalla barra', async ({ page }) => {
    await start(page, withBar());
    await input(page).fill('stopwatch');
    await page.getByRole('option', { name: /Add Stopwatch/ }).click(); // anche con il mouse, senza perdere il focus prima del clic
    await expect(widgets(page)).toHaveCount(2);
    await expect(menu(page)).toHaveCount(0);
  });

  test('Invio senza aver scelto una voce cerca sul web, come prima', async ({ page }) => {
    await start(page, withBar());
    await page.route('https://duckduckgo.com/**', (r) => r.fulfill({ contentType: 'text/html', body: 'ok' }));
    await input(page).fill('zucchine ricette');
    await page.keyboard.press('Enter');
    await page.waitForURL(/duckduckgo\.com\/\?q=zucchine%20ricette/);
  });

  test('un indirizzo scritto nella barra si apre direttamente', async ({ page }) => {
    await start(page, withBar());
    await page.route('https://example.org/**', (r) => r.fulfill({ contentType: 'text/html', body: 'ok' }));
    await input(page).fill('example.org/ciao');
    await page.keyboard.press('Enter');
    await page.waitForURL('https://example.org/ciao');
  });

  test('a campo vuoto la freccia in giù elenca i comandi; Esc chiude', async ({ page }) => {
    await start(page, withBar());
    await page.keyboard.press('Backslash');
    await expect(input(page)).toBeFocused();
    await expect(menu(page)).toHaveCount(0);
    await page.keyboard.press('ArrowDown');
    await expect(menu(page).getByRole('option', { name: /Go to Lavoro/ })).toBeVisible();
    await expect(menu(page).getByRole('option', { name: /New space$/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
  });

  test('anche il widget «Search» ha il menu, che non viene tagliato dal widget', async ({ page }) => {
    await start(page, desk([{ id: 'a', name: 'Space 1', widgets: [widgetAt('s', 'search', -150, -50), postit('p', 'zucchine')] }]));
    const box = widgets(page).first().locator('input');
    await box.fill('zucch');
    await expect(page.getByRole('option', { name: /zucchine/ })).toBeVisible();
    await expect(page.locator('body > ul.search-results')).toHaveCount(1); // fuori dal widget, che altrimenti lo taglierebbe
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });
});
