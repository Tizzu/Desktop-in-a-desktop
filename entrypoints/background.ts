import { browser } from 'wxt/browser';

// Timer e promemoria programmano un alarm; qui lo trasformiamo in notifica anche a scheda chiusa.
export default defineBackground(() => {
  browser.alarms.onAlarm.addListener((alarm) => {
    const reminder = alarm.name.startsWith('reminder:') ? alarm.name.split(':').slice(2).join(':') : undefined;
    if (!alarm.name.startsWith('timer:') && reminder === undefined) return;
    browser.notifications.create(alarm.name, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: 'Desktop in a Desktop',
      message: reminder || (reminder === undefined ? 'Il timer è scaduto.' : 'Promemoria'),
    });
  });
});
