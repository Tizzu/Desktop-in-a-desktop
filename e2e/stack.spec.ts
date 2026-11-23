import { expect, test, type Locator, type Page } from '@playwright/test';
import { appData, openApp, position, readSaved, seed, widgetAt, widgets, answer, confirmBox } from './helpers';

// Coordinate rispetto al centro della tela (versione 3 dei dati); `links` sono gli agganci già presenti.
const openLinked = async (page: Page, list: unknown[], links: [string, string][], settings: Record<string, unknown> = {}) => {
  await openApp(page);
  const data = { ...appData(list, settings), version: 3 };
  (data.workspaces[0] as { links?: unknown }).links = links;
  await seed(page, data);
};
const saved = async (page: Page) => {
  await page.waitForTimeout(600);
  return (await readSaved(page)).workspaces[0];
};
const size = async (w: Locator) => {
  const b = (await w.boundingBox())!;
  return { w: b.width, h: b.height };
};
const resize = async (page: Page, w: Locator, dx: number, dy: number) => {
  const b = (await w.locator('.resize-handle').boundingBox())!;
  const [x, y] = [b.x + b.width - 5, b.y + b.height - 5];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
};
const FREE = { tilt: 0, physics: false };

test.describe('ridimensionare un widget agganciato', () => {
  test('quelli attaccati a destra lo seguono, con tutto ciò che è attaccato a loro, e restano agganciati', async ({ page }) => {
    await openLinked(page, [widgetAt('a', 'postit', -420, -100), widgetAt('b', 'postit', -160, -100), widgetAt('c', 'postit', 100, -100)], [['a', 'b'], ['b', 'c']], FREE);
    const [a, b, c] = [widgets(page).nth(0), widgets(page).nth(1), widgets(page).nth(2)];
    const [bx, cx] = [(await position(b)).x, (await position(c)).x];
    const before = await size(a);
    await resize(page, a, 70, 0);
    const after = await size(a);
    expect(after.w).toBeGreaterThan(before.w + 50);

    const [pa, pb, pc] = [await position(a), await position(b), await position(c)];
    expect(pb.x - pa.x).toBeCloseTo(after.w, 0); // b tocca ancora il nuovo bordo di a
    expect(pc.x - pb.x).toBeCloseTo(260, 0); // e c sta ancora attaccato a b
    expect(pb.x - bx).toBeCloseTo(after.w - before.w, 0); // si è spostato di quanto a è cresciuto
    expect(pc.x - cx).toBeCloseTo(after.w - before.w, 0);
    await expect(page.locator('.link-spot')).toHaveCount(2);
    expect((await saved(page)).links).toHaveLength(2);

    await resize(page, a, -40, 0); // rimpicciolendo tornano indietro
    const small = await size(a);
    expect((await position(b)).x - (await position(a)).x).toBeCloseTo(small.w, 0);
    await expect(page.locator('.link-spot')).toHaveCount(2);
  });

  test('quelli attaccati sotto seguono in verticale', async ({ page }) => {
    await openLinked(page, [widgetAt('a', 'postit', -130, -200), widgetAt('d', 'postit', -130, 0)], [['a', 'd']], FREE);
    const [a, d] = [widgets(page).nth(0), widgets(page).nth(1)];
    const before = await size(a);
    await resize(page, a, 0, 60);
    const after = await size(a);
    expect(after.h).toBeGreaterThan(before.h + 40);
    expect((await position(d)).y - (await position(a)).y).toBeCloseTo(after.h, 0);
    await expect(page.locator('.link-spot')).toHaveCount(1);
  });

  test('chi sta a sinistra o sopra non si muove', async ({ page }) => {
    await openLinked(page, [widgetAt('e', 'postit', -420, -100), widgetAt('a', 'postit', -160, -100)], [['e', 'a']], FREE);
    const e = widgets(page).nth(0);
    const before = await position(e);
    await resize(page, widgets(page).nth(1), 60, 40);
    expect(await position(e)).toEqual(before);
    await expect(page.locator('.link-spot')).toHaveCount(1);
  });

  test('non si ingrandisce oltre lo spazio che resta a chi lo segue', async ({ page }) => {
    // b arriva a 10px dal bordo destro della finestra (1100px): a può crescere di quei 10px e basta
    await openLinked(page, [widgetAt('a', 'postit', 20, -100), widgetAt('b', 'postit', 280, -100)], [['a', 'b']], FREE);
    const a = widgets(page).nth(0);
    const before = await size(a);
    await resize(page, a, 200, 0);
    expect((await size(a)).w - before.w).toBeLessThanOrEqual(12);
    await expect(page.locator('.link-spot')).toHaveCount(1);
  });

  test('se un lato diventa troppo corto, l\'aggancio si scioglie', async ({ page }) => {
    // b è agganciato al lato destro di a ma più in basso: con a molto più bassa non si toccano più
    await openLinked(page, [widgetAt('a', 'postit', -420, -100), widgetAt('b', 'postit', -160, 50)], [['a', 'b']], FREE);
    await expect(page.locator('.link-spot')).toHaveCount(1);
    await resize(page, widgets(page).nth(0), 0, -150);
    await expect(page.locator('.link-spot')).toHaveCount(0);
    expect((await saved(page)).links).toEqual([]);
  });
});

test.describe('contenitori impilati', () => {
  const box = (id: string, y: number, h: number) => ({ ...widgetAt(id, 'container', -300, y), w: 400, h, state: { collapsed: true } });
  const open = (w: Locator) => w.getByRole('button', { name: 'Open container' }).click();
  const close = (w: Locator) => w.getByRole('button', { name: 'Close container' }).click();
  const rect = async (w: Locator) => (await w.boundingBox())!;

  test('aprendo quello in alto spingono giù quelli sotto; chiudendolo tornano su', async ({ page }) => {
    await openLinked(page, [box('t', -260, 200), box('u', -230, 140), box('v', -200, 120)], [['t', 'u'], ['u', 'v']], FREE);
    const [t, u, v] = [widgets(page).nth(0), widgets(page).nth(1), widgets(page).nth(2)];
    const u0 = (await rect(u)).y, v0 = (await rect(v)).y;
    await expect(page.locator('.link-spot')).toHaveCount(2);

    await open(t);
    const [rt, ru, rv] = [await rect(t), await rect(u), await rect(v)];
    expect(rt.height).toBeGreaterThan(150); // aperto
    expect(ru.y).toBeGreaterThanOrEqual(rt.y + rt.height - 1); // u sta sotto t, non sopra il suo corpo
    expect(rv.y).toBeGreaterThanOrEqual(ru.y + ru.height - 1);
    expect(ru.y - u0).toBeCloseTo(rt.height - 30, 0); // spinto giù di quanto t è cresciuto
    expect(rv.y - v0).toBeCloseTo(rt.height - 30, 0);
    await expect(page.locator('.link-spot')).toHaveCount(2); // ancora attaccati

    await open(u); // aprendo quello in mezzo si muovono solo quelli sotto
    const [ru2, rv2, rt2] = [await rect(u), await rect(v), await rect(t)];
    expect(rt2.y).toBeCloseTo(rt.y, 0);
    expect(rv2.y).toBeGreaterThanOrEqual(ru2.y + ru2.height - 1);

    await close(u);
    await close(t); // richiudendoli tornano dove erano
    expect((await rect(u)).y).toBeCloseTo(u0, 0);
    expect((await rect(v)).y).toBeCloseTo(v0, 0);
    await expect(page.locator('.link-spot')).toHaveCount(2);
  });

  test('un contenitore non agganciato sotto resta dov\'è', async ({ page }) => {
    await openLinked(page, [box('t', -260, 200), box('u', -230, 140), box('z', -100, 100)], [['t', 'u']], FREE);
    const z0 = (await rect(widgets(page).nth(2))).y;
    await open(widgets(page).nth(0));
    expect((await rect(widgets(page).nth(2))).y).toBeCloseTo(z0, 0);
  });

  test('sul grande e sul piccolo: l\'ordine dei widget non conta, conta chi è agganciato', async ({ page }) => {
    await openLinked(page, [box('v', -200, 120), box('t', -260, 200), box('u', -230, 140)], [['t', 'u'], ['u', 'v']], FREE);
    const [v, t, u] = [widgets(page).nth(0), widgets(page).nth(1), widgets(page).nth(2)];
    await open(t);
    const [rt, ru, rv] = [await rect(t), await rect(u), await rect(v)];
    expect(ru.y).toBeGreaterThanOrEqual(rt.y + rt.height - 1);
    expect(rv.y).toBeGreaterThanOrEqual(ru.y + ru.height - 1);
  });
});

test.describe('scorrere un widget agganciato (Maiusc)', () => {
  const slidePair = (page: Page) => openLinked(page, [widgetAt('a', 'postit', -420, -120), widgetAt('b', 'postit', -160, -80)], [['a', 'b']], FREE);
  const drag = async (page: Page, w: Locator, dx: number, dy: number, shift: boolean) => {
    const b = (await w.locator('.widget-bar').boundingBox())!;
    const [x, y] = [b.x + 40, b.y + b.height / 2];
    if (shift) await page.keyboard.down('Shift');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 8 });
    await page.mouse.up();
    if (shift) await page.keyboard.up('Shift');
  };

  test('scorre lungo il bordo, senza muovere l\'altro e senza sganciarsi', async ({ page }) => {
    await slidePair(page);
    const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
    const [pa, pb] = [await position(a), await position(b)];
    await drag(page, b, 60, 100, true); // anche in diagonale: conta solo l'asse del bordo
    const [qa, qb] = [await position(a), await position(b)];
    expect(qa).toEqual(pa); // a non si è mosso
    expect(qb.x).toBe(pb.x); // b resta attaccato al bordo
    expect(qb.y - pb.y).toBeCloseTo(100, 0);
    await expect(page.locator('.link-spot')).toHaveCount(1);
    expect((await saved(page)).links).toHaveLength(1);
  });

  test('si allinea al vicino quando ci si avvicina, e non esce dal bordo', async ({ page }) => {
    await slidePair(page);
    const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
    await drag(page, b, 0, -45, true); // b parte 40px sotto a: -45 è a 5px dall'allineamento
    expect((await position(b)).y).toBe((await position(a)).y); // bordi superiori allineati
    await drag(page, b, 0, 900, true); // molto in basso: si ferma quando restano toccati
    const [pa, pb] = [await position(a), await position(b)];
    expect(pb.y).toBeLessThan(pa.y + 200 - 20); // il bordo inferiore di a è 200px sotto: ancora in contatto
    await expect(page.locator('.link-spot')).toHaveCount(1);
  });

  test('senza Maiusc si muove tutto il gruppo', async ({ page }) => {
    await slidePair(page);
    const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
    const [pa, pb] = [await position(a), await position(b)];
    await drag(page, b, 0, 30, false);
    expect((await position(a)).y - pa.y).toBeCloseTo(30, 0);
    expect((await position(b)).y - pb.y).toBeCloseTo(30, 0);
  });

  test('un widget libero si muove normalmente anche con Maiusc', async ({ page }) => {
    await openLinked(page, [widgetAt('s', 'postit', -130, -100)], [], FREE);
    const s = widgets(page).first();
    const p0 = await position(s);
    await drag(page, s, 50, 40, true);
    const p1 = await position(s);
    expect(p1.x - p0.x).toBeCloseTo(50, 0);
    expect(p1.y - p0.y).toBeCloseTo(40, 0);
  });

  test('un widget fissato non scorre', async ({ page }) => {
    await slidePair(page);
    const b = widgets(page).nth(1);
    await b.getByRole('button', { name: 'Pin widget', exact: true }).click();
    const p0 = await position(b);
    await drag(page, b, 0, 80, true);
    expect(await position(b)).toEqual(p0);
  });
});

test.describe('timer di concentrazione: ricominciare', () => {
  const today = () => new Date().toLocaleDateString('sv');
  const pomo = (state: Record<string, unknown>) => widgetAt('p', 'pomodoro', -130, -100, { phase: 'short', endsAt: null, left: null, done: 2, day: today(), ...state });
  const phase = (w: Locator) => w.locator('.timer-note').first();
  const lit = (w: Locator) => w.locator('.pomo-dots span.on');

  test('il pulsante ↺ ricomincia da capo, chiedendo conferma se c\'è qualcosa da perdere', async ({ page }) => {
    await openLinked(page, [pomo({})], [], FREE);
    const w = widgets(page).first();
    await expect(phase(w)).toHaveText('Short break');
    await expect(lit(w)).toHaveCount(2);

    await w.getByRole('button', { name: 'Start over', exact: true }).click();
    await answer(page, false);
    await expect(lit(w)).toHaveCount(2); // annullato

    await w.getByRole('button', { name: 'Start over', exact: true }).click();
    await expect(confirmBox(page)).toContainText('Start over');
    await answer(page, true);
    await expect(phase(w)).toHaveText('Focus');
    await expect(lit(w)).toHaveCount(0);
  });

  test('con un timer in corso ricomincia fermandolo', async ({ page }) => {
    await openLinked(page, [pomo({ phase: 'focus', endsAt: Date.now() + 3_600_000, done: 0 })], [], FREE);
    const w = widgets(page).first();
    await expect(w.getByRole('button', { name: 'Pause' })).toBeVisible();
    await w.getByRole('button', { name: 'Start over', exact: true }).click();
    await answer(page, true);
    await expect(w.getByRole('button', { name: 'Start', exact: true })).toBeVisible(); // fermo
    await expect(w.locator('.timer-time')).toHaveText('25:00');
  });

  test('un giorno nuovo si riparte da capo, da soli', async ({ page }) => {
    await openLinked(page, [pomo({ day: '2000-01-01', phase: 'long', done: 3 })], [], FREE);
    const w = widgets(page).first();
    await expect(phase(w)).toHaveText('Focus');
    await expect(lit(w)).toHaveCount(0);
    expect((await saved(page)).widgets[0].state.day).toBe(today());
  });

  test('il reset giornaliero si spegne dal ⚙, e i dati di prima (senza giorno) non si azzerano', async ({ page }) => {
    await openLinked(page, [pomo({ day: '2000-01-01', done: 3, cfg: { focus: 25, short: 5, long: 15, sessions: 4, auto: false, dailyReset: false } })], [], FREE);
    const w = widgets(page).first();
    await expect(lit(w)).toHaveCount(3); // spento: resta com'era
    await w.getByRole('button', { name: 'Customise' }).click();
    await expect(w.getByLabel('Start over every day')).not.toBeChecked();
    await w.getByLabel('Start over every day').check();
    await w.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(phase(w)).toHaveText('Focus'); // acceso: il giorno è passato, riparte
  });

  test('i dati di prima (senza giorno) non si azzerano, e da qui in poi tengono il giorno', async ({ page }) => {
    await openLinked(page, [pomo({ day: undefined, done: 3 })], [], FREE); // salvato dalla 0.5: senza giorno
    const w = widgets(page).first();
    await expect(lit(w)).toHaveCount(3);
    expect((await saved(page)).widgets[0].state.day).toBe(today());
  });

  test('a timer in corso non si ricomincia: si aspetta che si fermi', async ({ page }) => {
    await openLinked(page, [pomo({ day: '2000-01-01', phase: 'focus', endsAt: Date.now() + 3_600_000, done: 3 })], [], FREE);
    const w = widgets(page).first();
    await expect(w.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(lit(w)).toHaveCount(3); // non toccato
    await w.getByRole('button', { name: 'Pause' }).click();
    await expect(lit(w)).toHaveCount(0); // appena si ferma, è un giorno nuovo: riparte
    await expect(phase(w)).toHaveText('Focus');
  });

  test('a mezzanotte, con la pagina aperta, ricomincia', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 23, 59, 50) });
    await openLinked(page, [pomo({ day: '2026-10-28', done: 2 })], [], FREE);
    const w = widgets(page).first();
    await expect(lit(w)).toHaveCount(2);
    await page.clock.fastForward(20_000);
    await expect(lit(w)).toHaveCount(0);
    await expect(phase(w)).toHaveText('Focus');
  });
});

test.describe('spazio che si apre in modalità privacy', () => {
  const veil = (page: Page) => page.getByRole('dialog', { name: 'Privacy mode', exact: true });
  const gear = (page: Page) => page.getByRole('button', { name: 'Space options', exact: true });
  const tab = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

  test('appena ci si entra la pagina si nasconde; mostrata, resta visibile finché non si cambia spazio', async ({ page }) => {
    await openApp(page);
    await gear(page).click();
    await page.getByLabel('Open this space in privacy mode').check();
    await page.keyboard.press('Escape');
    await expect(page.locator('.tab.active .tab-lock')).toHaveCount(1); // un lucchetto sul tab
    await expect(veil(page)).toHaveCount(0); // attivandolo non ci si nasconde da sé

    await page.getByRole('button', { name: 'New space' }).click(); // Space 2, normale
    await expect(veil(page)).toHaveCount(0);
    await tab(page, 'Space 1').click();
    await expect(veil(page)).toBeVisible();
    await expect(page.locator('.shell')).toHaveAttribute('inert', '');
    await veil(page).getByRole('button', { name: 'Show my desk' }).click();
    await expect(veil(page)).toHaveCount(0);

    await page.mouse.click(600, 400); // si lavora normalmente: non si rinasconde
    await page.waitForTimeout(300);
    await expect(veil(page)).toHaveCount(0);

    await tab(page, 'Space 2').click();
    await expect(veil(page)).toHaveCount(0);
    await tab(page, 'Space 1').click();
    await expect(veil(page)).toBeVisible();
  });

  test('se è lo spazio attivo all\'apertura, la pagina parte già nascosta', async ({ page }) => {
    await openApp(page);
    await gear(page).click();
    await page.getByLabel('Open this space in privacy mode').check();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700); // salvataggio
    await page.reload();
    await expect(veil(page)).toBeVisible();
    await expect(page.locator('.shell')).toHaveAttribute('inert', '');
  });

  test('si toglie dalle opzioni dello spazio, e il dato si salva', async ({ page }) => {
    await openApp(page);
    await gear(page).click();
    await page.getByLabel('Open this space in privacy mode').check();
    expect((await saved(page)).privacy).toBe(true);
    await page.getByLabel('Open this space in privacy mode').uncheck();
    expect((await saved(page)).privacy).toBeUndefined();
    await expect(page.locator('.tab-lock')).toHaveCount(0);
  });
});
