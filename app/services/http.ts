/**
 * Módulo HTTP base — todas as requisições do frontend passam por aqui.
 * Centraliza URL base, headers, tratamento de erro, handshake nativo e sessão local.
 */

export const BACKEND_PORT = 12540;
export const API_BASE_URL = `http://127.0.0.1:${BACKEND_PORT}`;
export const WS_BASE_URL = `ws://127.0.0.1:${BACKEND_PORT}/api/ws`;

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ═══ Estado de Sessão Local mantido unicamente em Memória RAM ═══
let sessionToken: string | null = null;
let sessionExpiresAt: number = 0;
let ongoingHandshake: Promise<string> | null = null;

/**
 * Tenta obter ticket de handshake pelo canal nativo IPC do Tauri com tolerância a atraso de injeção
 */
async function getTicketFromTauriIPC(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    if (win?.__TAURI_INTERNALS__?.invoke) {
      return await win.__TAURI_INTERNALS__.invoke('get_handshake_ticket');
    }
    if (win?.__TAURI__?.core?.invoke) {
      return await win.__TAURI__.core.invoke('get_handshake_ticket');
    }
    // Aguarda 100ms caso o script do Tauri ainda esteja sendo injetado pelo WebView2
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Tauri IPC não disponível neste ambiente.');
}

/**
 * Realiza handshake seguro com o backend local com tentativas automáticas e fallback resiliente
 */
async function performHandshake(retries = 8, delayMs = 250): Promise<string> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    // 1. Tenta canal nativo Tauri IPC (se disponível no WebView2)
    try {
      const ticket = await getTicketFromTauriIPC();
      const res = await fetch(`${API_BASE_URL}/api/local-auth/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      });

      if (res.ok) {
        const data = await res.json();
        sessionToken = data.session_token;
        sessionExpiresAt = Date.now() + (data.expires_in * 1000);
        return sessionToken!;
      }
      lastError = new Error(`Handshake via ticket retornou status ${res.status}`);
    } catch (err: any) {
      lastError = err;
    }

    // 2. Fallback imediato: handshake de loopback verificado (cliente desktop local)
    try {
      const devRes = await fetch(`${API_BASE_URL}/api/local-auth/dev-handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (devRes.ok) {
        const data = await devRes.json();
        sessionToken = data.session_token;
        sessionExpiresAt = Date.now() + (data.expires_in * 1000);
        return sessionToken!;
      }
    } catch (err: any) {
      lastError = err;
    }

    // Se ainda houver tentativas, aguarda brevemente para que o backend conclua o bind de porta no Windows
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  // Se o backend ainda estiver iniciando, usa token de loopback para permitir que o cliente desktop continue
  console.warn('⚠️ Handshake pendente de resposta do backend local:', lastError);
  sessionToken = 'ses_fallback_loopback';
  sessionExpiresAt = Date.now() + 3600_000;
  return sessionToken;
}

/**
 * Garante que uma sessão desktop válida esteja disponível antes de disparar a requisição
 */
export async function ensureSession(): Promise<string> {
  // Se ainda estiver válida com margem de 1 minuto, reutiliza
  if (sessionToken && Date.now() < sessionExpiresAt - 60_000) {
    return sessionToken;
  }

  // Previne múltiplas requisições simultâneas de realizarem múltiplos handshakes ao mesmo tempo
  if (!ongoingHandshake) {
    ongoingHandshake = performHandshake().finally(() => {
      ongoingHandshake = null;
    });
  }

  return await ongoingHandshake;
}

/**
 * Solicita um Action Ticket de uso único para operações de alto privilégio (apply-update, download)
 */
export async function getActionTicket(action: string = 'apply_update'): Promise<string> {
  const win = typeof window !== 'undefined' ? (window as any) : undefined;
  if (win?.__TAURI_INTERNALS__?.invoke) {
    try {
      return await win.__TAURI_INTERNALS__.invoke('get_action_ticket', { action });
    } catch { }
  }

  const res = await http.post<{ action_ticket: string }>('/api/local-auth/action-ticket', { action });
  return res.action_ticket;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  params?: Record<string, any>
): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  // Se não for rota do handshake local, assegura sessão válida
  const isHandshakeRoute = endpoint.startsWith('/api/local-auth/handshake') || endpoint.startsWith('/api/local-auth/dev-handshake');
  if (!isHandshakeRoute) {
    try {
      const token = await ensureSession();
      if (token) {
        headers['X-Session-Token'] = token;
      }
    } catch (e) {
      console.warn('Falha transitória no handshake desktop:', e);
    }
  }

  try {
    let res = await fetch(url, {
      ...options,
      headers,
    });

    // Se o backend indicar sessão expirada, refaz handshake uma vez e repete a chamada
    if (res.status === 401 && !isHandshakeRoute) {
      sessionToken = null;
      sessionExpiresAt = 0;
      const refreshedToken = await ensureSession();
      if (refreshedToken) {
        headers['X-Session-Token'] = refreshedToken;
        res = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    if (!res.ok) {
      let errorMsg = `Erro ${res.status}: ${res.statusText}`;
      let errorCode: string | undefined;
      try {
        const text = await res.text();
        try {
          const errJson = JSON.parse(text);
          errorCode = errJson.code;
          errorMsg =
            errJson.detail ||
            errJson.error ||
            errJson.message ||
            (typeof errJson === 'string' ? errJson : text);
        } catch {
          if (text && text.trim().length > 0) {
            errorMsg = text;
          }
        }
      } catch { }
      throw new ApiError(res.status, errorMsg, errorCode);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, `Não foi possível conectar ao backend local em ${API_BASE_URL}. Certifique-se de que o backend Rust está rodando.`);
  }
}

/** Atalhos tipados para os verbos HTTP */
export const http = {
  get: <T>(endpoint: string, config?: { params?: Record<string, any>; headers?: Record<string, string> }) =>
    request<T>(endpoint, { headers: config?.headers }, config?.params),

  post: <T>(endpoint: string, body?: any, config?: { headers?: Record<string, string> }) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      method: 'POST',
      headers: config?.headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(endpoint: string, body?: any, config?: { headers?: Record<string, string> }) =>
    request<T>(endpoint, {
      method: 'PUT',
      headers: config?.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, config?: { headers?: Record<string, string> }) =>
    request<T>(endpoint, { method: 'DELETE', headers: config?.headers }),

  /** Chamada genérica para casos especiais */
  request,
};

export default http;
