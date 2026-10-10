import { WS_BASE_URL } from '../http';

export type WsEventName =
  | 'profile_status'
  | 'profile_syncing'
  | 'profile_synced'
  | 'profile_sync_failed'
  | 'profile_migrating'
  | 'profile_migrated'
  | 'browser_download_progress'
  | 'app_update_progress'
  | 'notification';

export interface ProfileStatusData {
  profile_id: string;
  status: 'running' | 'ready' | string;
}

export interface ProfileSyncingData {
  profile_id: string;
}

export interface ProfileSyncedData {
  profile_id: string;
  size_kb: number;
}

export interface ProfileSyncFailedData {
  profile_id: string;
  error: string;
}

export interface BrowserDownloadProgressData {
  stage: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_mb_s: number;
  eta_seconds: number;
  error?: string | null;
}

export interface NotificationData {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'migration';
  timestamp: number;
}

type EventCallback<T = any> = (data: T) => void;

/**
 * Hub Centralizado de WebSocket (Singleton Pub/Sub).
 * Mantém uma única conexão viva com o backend Rust em ws://127.0.0.1:12540/api/ws.
 * Elimina conexões duplicadas e distribui eventos para todos os componentes inscritos.
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this.isExplicitlyClosed = false;

    try {
      this.socket = new WebSocket(WS_BASE_URL);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log('⚡ [wsService] Conectado ao canal único WebSocket do Star Multlogin Backend');
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.event) {
            this.dispatch(payload.event, payload.data);
          }
        } catch (err) {
          console.warn('[wsService] Erro ao parsear mensagem do WebSocket:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.isConnecting = false;
        // O evento onclose cuidará do agendamento de reconexão
      };
    } catch (err) {
      this.isConnected = false;
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 2500);
  }

  private dispatch(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[wsService] Erro no listener do evento "${event}":`, e);
        }
      });
    }

    // Listener curinga '*'
    const wildcards = this.listeners.get('*');
    if (wildcards) {
      wildcards.forEach((cb) => {
        try {
          cb({ event, data });
        } catch (e) {
          console.error('[wsService] Erro no listener curinga:', e);
        }
      });
    }
  }

  /**
   * Assina um evento específico. Retorna uma função de unsubscribe.
   */
  public subscribe<T = any>(event: WsEventName | string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Garante que a conexão está ativa
    if (!this.isConnected && !this.isConnecting) {
      this.connect();
    }

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  public getConnected(): boolean {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();
export default wsService;
