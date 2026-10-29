import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Desktop in a Desktop',
    description: 'Spazi di lavoro a widget per la tua nuova scheda.',
    icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 96: 'icon/96.png', 128: 'icon/128.png' },
    permissions: ['storage', 'alarms', 'notifications', 'search'],
  },
});
