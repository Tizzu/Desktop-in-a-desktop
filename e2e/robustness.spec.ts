import { expect, test } from '@playwright/test';
import { appData, dragToolTo, openApp, seed, widgetAt, widgets } from './helpers';

test('dati salvati rovinati non lasciano la pagina bianca', async ({ page }) => {
  await openApp(page);
  await seed(page, { workspaces: 'rotto', activeWorkspaceId: 42 });
  await expect(page.locator('.drawer-item').first()).toBeVisible();
  await expect(page.locator('.tab.active')).toBeVisible();
  await dragToolTo(page, 'Sticky note', 400, 250); // e l'app resta utilizzabile
  await expect(widgets(page)).toHaveCount(1);
});

test('widget con dati inutilizzabili vengono scartati, gli altri restano', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([widgetAt('ok', 'postit', 40, 40, { text: 'sano' }), { id: 'x', type: 'postit', x: 'boh', y: 1, w: 1, h: 1 }, null, widgetAt('ignoto', 'tipo-che-non-esiste', 10, 10)]));
  await expect(widgets(page)).toHaveCount(1); // l'ignoto non ha un componente; i rotti sono scartati
  await expect(widgets(page).first().locator('textarea')).toHaveValue('sano');
});

test('un widget che va in errore non blocca gli altri', async ({ page }) => {
  await openApp(page);
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // I widget stanno sotto la fascia in cui i tool sporgono dalla barra, che altrimenti ne coprirebbe i pulsanti.
  // La lista "To do" si aspetta un array: con `null` il rendering lancia un errore.
  await seed(page, appData([widgetAt('rotto', 'todo', 20, 160, { items: null }), widgetAt('sano', 'postit', 320, 160, { text: 'funziono' })]));

  await expect(widgets(page)).toHaveCount(2);
  await expect(page.locator('.widget-error')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('ran into a problem');
  await expect(widgets(page).nth(1).locator('textarea')).toHaveValue('funziono');
  await page.getByRole('button', { name: 'Remove widget' }).first().click(); // il widget rotto si può togliere
  await expect(page.locator('.widget-error')).toHaveCount(0);
  await expect(widgets(page)).toHaveCount(1);
  expect(errors.length).toBeGreaterThan(0); // l'errore è stato registrato, non nascosto
});

test('con il database bloccato l\'app si apre e conserva i dati nella copia di sicurezza', async ({ page }) => {
  // Simula IndexedDB non disponibile (profilo con dati disattivati, modalità restrittive…).
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('bloccato', 'SecurityError');
    };
  });
  await page.goto('/newtab.html');
  await page.locator('.drawer-item').first().waitFor();

  await dragToolTo(page, 'Sticky note', 400, 250);
  await widgets(page).first().locator('textarea').fill('salvato altrove');
  await page.waitForTimeout(500);

  await page.reload();
  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('textarea')).toHaveValue('salvato altrove');
});
