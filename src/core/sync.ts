import type { Action } from './store';
import type { AppData } from './types';

/** Completa un'azione con tutto ciò che deve essere identico in ogni scheda (id, nome, spazio di destinazione). */
export function prepare(a: Action, s: AppData): Action {
  switch (a.type) {
    case 'addWorkspace': {
      const order = a.order ?? s.workspaces.reduce((m, w) => Math.max(m, w.order), -1) + 1;
      return { ...a, id: a.id ?? crypto.randomUUID(), order, name: a.name ?? `Spazio ${order + 1}`, activate: a.activate ?? true };
    }
    case 'addWidget':
    case 'updateWidget':
    case 'removeWidget':
    case 'bringToFront':
      return { ...a, ws: a.ws ?? s.activeWorkspaceId };
    default:
      return a;
  }
}

/**
 * Cosa va inviato alle altre schede. Restano locali: spazio attivo e cassetto aperto, così in due schede
 * si può guardare cose diverse. Null = niente da inviare.
 */
export function toShared(a: Action): Action | null {
  switch (a.type) {
    case 'load':
    case 'setActive':
      return null;
    case 'addWorkspace':
      return { ...a, activate: false }; // chi riceve non cambia lo spazio che sta guardando
    case 'setSettings': {
      const { activeCategory: _local, ...rest } = a.patch;
      return Object.keys(rest).length ? { ...a, patch: rest } : null;
    }
    default:
      return a;
  }
}

/** Stato completo ricevuto da un'altra scheda, tenendo ciò che è locale (spazio attivo, cassetto aperto). */
export function mergeRemoteState(local: AppData, remote: AppData): AppData {
  const keepActive = remote.workspaces.some((w) => w.id === local.activeWorkspaceId);
  return {
    ...remote,
    activeWorkspaceId: keepActive ? local.activeWorkspaceId : remote.activeWorkspaceId,
    settings: { ...remote.settings, activeCategory: local.settings.activeCategory },
  };
}

type Message =
  | { kind: 'action'; from: string; action: Action }
  | { kind: 'hello'; from: string }
  | { kind: 'state'; from: string; to: string; data: AppData };

export interface Sync {
  sendAction: (a: Action) => void;
  /** Chiede lo stato attuale alle altre schede aperte (se ce ne sono, una risponde con `onState`). */
  hello: () => void;
  close: () => void;
}

const CHANNEL = 'desktop-in-a-desktop';

/** Sincronizzazione tra schede della stessa estensione, tutta locale (BroadcastChannel): nessun server, nessuna rete. */
export function createSync(handlers: {
  getData: () => AppData;
  onAction: (a: Action) => void;
  onState: (data: AppData) => void;
}): Sync {
  const id = crypto.randomUUID();
  const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(CHANNEL);
  let gotState = false; // più schede rispondono con lo stesso stato: basta la prima

  if (channel) {
    channel.onmessage = (e: MessageEvent<Message>) => {
      const m = e.data;
      if (m.from === id) return;
      if (m.kind === 'action') handlers.onAction(m.action);
      else if (m.kind === 'hello') channel.postMessage({ kind: 'state', from: id, to: m.from, data: handlers.getData() } satisfies Message);
      else if (m.kind === 'state' && m.to === id && !gotState) {
        gotState = true;
        handlers.onState(m.data);
      }
    };
  }

  return {
    sendAction: (action) => channel?.postMessage({ kind: 'action', from: id, action } satisfies Message),
    hello: () => channel?.postMessage({ kind: 'hello', from: id } satisfies Message),
    close: () => channel?.close(),
  };
}
