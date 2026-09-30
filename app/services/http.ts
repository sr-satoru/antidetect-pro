/**
 * Módulo HTTP base — todas as requisições do frontend passam por aqui.
 * Centraliza URL base, headers, tratamento de erro e token.
 */

export const BACKEND_PORT = 12540;
export const API_BASE_URL = `http://127.0.0.1:${BACKEND_PORT}`;
export const WS_BASE_URL = `ws://127.0.0.1:${BACKEND_PORT}/api/ws`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
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

  let token = localStorage.getItem('star_auth_token');
  if (endpoint.startsWith('/api/v1') || endpoint.startsWith('/v1') || endpoint.startsWith('/mcp')) {
    token = localStorage.getItem('star_mcp_token') || token;
  } else if (!token) {
    token = localStorage.getItem('star_mcp_token');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!headers['Authorization'] && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Erro ${res.status}: ${res.statusText}`;
      try {
        const text = await res.text();
        try {
          const errJson = JSON.parse(text);
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
      } catch {}
      throw new ApiError(res.status, errorMsg);
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
  get: <T>(endpoint: string, config?: { params?: Record<string, any> }) =>
    request<T>(endpoint, {}, config?.params),

  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  /** Chamada genérica para casos especiais */
  request,
};

export default http;
