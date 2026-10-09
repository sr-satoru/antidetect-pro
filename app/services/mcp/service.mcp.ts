import { http, API_BASE_URL } from '../http';

export interface McpInfoResponse {
  token: string;
  server_url: string;
  mcp_url: string;
}

export interface McpStatusResponse {
  status: string;
  version?: string;
  uptime_seconds?: number;
  profiles_running?: number;
}

export interface ExecuteTestRequestOptions {
  path: string;
  method: string;
  body?: any;
  token?: string;
}

export interface ExecuteTestResult {
  status: number;
  data: any;
  latencyMs: number;
  isSimulated?: boolean;
}

export const DEFAULT_MCP_TOKEN = '';

// Cache em memória do token MCP para a sessão atual (sem tocar no localStorage)
let cachedMcpInfo: McpInfoResponse | null = null;

export const serviceMcp = {
  /**
   * Obtém as credenciais dinâmicas do servidor MCP geradas pelo backend Rust
   */
  getInfo: async (): Promise<McpInfoResponse> => {
    const info = await http.get<McpInfoResponse>('/mcp/info');
    if (info?.token) {
      cachedMcpInfo = info;
    }
    return info;
  },

  /**
   * Rotaciona/regenera o token de autenticação no banco SQLite Star Vault
   */
  rotateToken: async (): Promise<McpInfoResponse> => {
    const info = await http.post<McpInfoResponse>('/mcp/rotate-token', {});
    if (info?.token) {
      cachedMcpInfo = info;
    }
    return info;
  },

  /**
   * Retorna o token em memória se já consultado
   */
  getCachedToken: (): string => {
    return cachedMcpInfo?.token || '';
  },

  /**
   * Consulta o status do motor de automação MCP
   */
  getStatus: (): Promise<McpStatusResponse> =>
    http.get<McpStatusResponse>('/api/v1/status'),

  /**
   * Executa requisições de teste reais contra o backend local a partir do console de documentação interativa
   */
  executeTestRequest: async (
    options: ExecuteTestRequestOptions,
    mockFallback?: any,
  ): Promise<ExecuteTestResult> => {
    const startTime = performance.now();
    const token = options.token || cachedMcpInfo?.token || '';
    const fullUrl = `${API_BASE_URL}${options.path}`;

    try {
      const res = await fetch(fullUrl, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.method !== 'GET' && options.method !== 'HEAD' && options.body
          ? JSON.stringify(options.body)
          : undefined,
        signal: AbortSignal.timeout(3000),
      });

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);
      const data = await res.json().catch(() => ({}));

      return {
        status: res.status,
        data,
        latencyMs,
        isSimulated: false,
      };
    } catch {
      // Fallback gracioso com mock caso o daemon esteja em standby
      const endTime = performance.now();
      return {
        status: 200,
        data: mockFallback || { ok: true, simulated: true },
        latencyMs: Math.round(endTime - startTime + 15),
        isSimulated: true,
      };
    }
  },
};

export default serviceMcp;
