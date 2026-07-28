'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

export const AlertSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['info', 'warning', 'critical']),
  message: z.string().min(1),
  timestamp: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type AlertRecord = z.infer<typeof AlertSchema>;

type AlertHandler = (payload?: unknown) => void;

interface SocketLike {
  connect: () => void;
  disconnect: () => void;
  on: (event: string, handler: AlertHandler) => void;
  off: (event: string, handler: AlertHandler) => void;
}

class BrowserSocketAdapter implements SocketLike {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<AlertHandler>>();

  constructor(private readonly url: string) {}

  public connect(): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    if (this.socket) {
      return;
    }

    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', () => this.emit('connect', { connected: true }));
    this.socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        this.emit('alert', payload);
      } catch {
        this.emit('alert', {
          message: event.data as string,
          kind: 'info',
          id: `socket-${Date.now()}`,
          timestamp: new Date().toISOString(),
        });
      }
    });
    this.socket.addEventListener('close', () => this.emit('disconnect', { connected: false }));
  }

  public disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.listeners.clear();
  }

  public on(event: string, handler: AlertHandler): void {
    const handlers = this.listeners.get(event) ?? new Set<AlertHandler>();
    handlers.add(handler);
    this.listeners.set(event, handlers);
  }

  public off(event: string, handler: AlertHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }
}

export function mergeAlerts(prev: AlertRecord[], incoming: AlertRecord[], maxAlerts = 200): AlertRecord[] {
  const deduped = new Map<string, AlertRecord>();
  for (const alert of [...prev, ...incoming]) {
    deduped.set(alert.id, alert);
  }

  return Array.from(deduped.values()).slice(-maxAlerts).reverse();
}

interface UseAlertsSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

export function useAlertsSocket(options: UseAlertsSocketOptions = {}): {
  alerts: AlertRecord[];
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
} {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<SocketLike | null>(null);
  const ownsSocketRef = useRef(false);
  const connectHandlerRef = useRef<AlertHandler>(() => undefined);
  const disconnectHandlerRef = useRef<AlertHandler>(() => undefined);
  const alertHandlerRef = useRef<AlertHandler>(() => undefined);
  const reconnectAttemptHandlerRef = useRef<AlertHandler>(() => undefined);
  const reconnectHandlerRef = useRef<AlertHandler>(() => undefined);

  const connect = useCallback(() => {
    if (socketRef.current) {
      return;
    }

    const url = options.url ?? process.env.NEXT_PUBLIC_ALERTS_SOCKET_URL ?? 'ws://localhost:3001';
    const socket = new BrowserSocketAdapter(url);
    ownsSocketRef.current = true;
    socketRef.current = socket;

    connectHandlerRef.current = () => setConnected(true);
    disconnectHandlerRef.current = () => setConnected(false);
    alertHandlerRef.current = (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      const parsed = AlertSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      setAlerts((prev) => mergeAlerts(prev, [parsed.data]));
    };
    reconnectAttemptHandlerRef.current = () => setConnected(false);
    reconnectHandlerRef.current = () => setConnected(true);

    socket.on('connect', connectHandlerRef.current);
    socket.on('alert', alertHandlerRef.current);
    socket.on('reconnect_attempt', reconnectAttemptHandlerRef.current);
    socket.on('reconnect', reconnectHandlerRef.current);

    socket.connect();
  }, [options.url]);

  const disconnect = useCallback(() => {
    if (!socketRef.current) {
      return;
    }

    const socket = socketRef.current;
    socket.off('connect', connectHandlerRef.current);
    socket.off('alert', alertHandlerRef.current);
    socket.off('reconnect_attempt', reconnectAttemptHandlerRef.current);
    socket.off('reconnect', reconnectHandlerRef.current);
    socket.disconnect();
    socketRef.current = null;
    ownsSocketRef.current = false;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (options.autoConnect === false) {
      return;
    }

    connect();
    return () => {
      if (ownsSocketRef.current) {
        disconnect();
      }
    };
  }, [connect, disconnect, options.autoConnect]);

  return { alerts, connected, connect, disconnect };
}
