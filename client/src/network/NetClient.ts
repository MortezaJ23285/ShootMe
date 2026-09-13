import type { ClientMessage, ServerMessage } from '@shootme/shared';

type Handler<T> = (msg: T) => void;

export class NetClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Handler<any>[]>();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('WebSocket connection failed'));
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as ServerMessage;
          const list = this.handlers.get(msg.t);
          if (list) for (const h of list) h(msg);
        } catch {
          // ignore malformed messages
        }
      };
      ws.onclose = () => {
        const list = this.handlers.get('_close');
        if (list) for (const h of list) h(undefined);
      };
    });
  }

  on<T extends ServerMessage['t']>(type: T, handler: Handler<Extract<ServerMessage, { t: T }>>) {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  onClose(handler: () => void) {
    const list = this.handlers.get('_close') ?? [];
    list.push(handler);
    this.handlers.set('_close', list);
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.ws?.close();
  }
}

export function resolveServerUrl(): string {
  const override = (import.meta as any).env?.VITE_SERVER_URL;
  if (override) return override;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const host = location.hostname;
  return `${proto}://${host}:8080`;
}
