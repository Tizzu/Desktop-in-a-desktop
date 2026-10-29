import { browser } from 'wxt/browser';
import { isLang, translate, type Lang } from '../src/core/i18n';

// Timer e promemoria programmano un alarm; qui lo trasformiamo in notifica anche a scheda chiusa.
export default defineBackground(() => {
  browser.alarms.onAlarm.addListener(async (alarm) => {
    const reminder = alarm.name.startsWith('reminder:') ? alarm.name.split(':').slice(2).join(':') : undefined;
    if (!alarm.name.startsWith('timer:') && reminder === undefined) return;
    // La lingua sceglie il testo del timer; quello dei promemoria è già stato scritto dall'utente (o dal widget).
    const stored = (await browser.storage.local.get('language').catch(() => ({}))) as { language?: unknown };
    const lang: Lang = isLang(stored.language) ? stored.language : 'en';
    browser.notifications.create(alarm.name, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: 'Desktop in a Desktop',
      message: reminder ? translate(lang, reminder) : translate(lang, reminder === undefined ? 'The timer is up.' : 'Reminder'),
    });
  });
});
