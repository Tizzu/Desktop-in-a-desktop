import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    // Chiave pubblica: fissa l'ID dell'estensione, uguale su ogni computer e in ogni build, così un'installazione
    // si aggiorna sopra la precedente tenendo i dati. Non è un segreto; la chiave privata non serve e non è nel repo.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtqTxP1innusr6iqvrzuxYLOa382vqN3x1uvXDuCwDTP8KtH7aNhotp7erN9JUAEu4xoUWtEHt3bEhAoVClI6v6DIh9cfqK3u765f2oZOr52LFhA8Zl4/npyuCGVHfG8IZX6cZ6V1PTesbOKVIbLLFJsT1yS/rHw36B6dLQoM2+xeZ2fnXa9bg9+aR0cfBdw0CSEN/fs7PSGjT74PmcSl/56qGDJsJszque+KWrWVQ0UpNztrtuzqxV81LBA2jMldrSDRvou01smbVpJj0d7kzBxnpWd02pXPYxOCNQrXWFneZBuj0zYgEL0YSroFJv1HFunvBb+V7mLPYJ207j2ARwIDAQAB',
    name: 'Desktop in a Desktop',
    description: 'A desk of widgets for your new tab: notes, timers, trackers and more. Everything stays on your computer.',
    icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 96: 'icon/96.png', 128: 'icon/128.png' },
    permissions: ['storage', 'alarms', 'notifications', 'search'],
  },
});
