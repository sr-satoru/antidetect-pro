import { http } from '../http';
import type { ProxyItem, ProxyTestResult, TestProxyDto } from '@/types';

export interface ParsedProxyItem {
  id: string;
  type: string;
  host: string;
  port: string;
  user: string;
  pass: string;
  rotationLink: string;
  notes: string;
  outboundIp: string;
  isValid: boolean;
  status:
    | 'idle'
    | 'checking'
    | 'active'
    | 'auth_error'
    | 'connection_error'
    | 'timeout'
    | 'error';
  ping?: number;
}

export interface FormattedTestResult {
  status: 'idle' | 'active' | 'auth_error' | 'connection_error' | 'timeout' | 'error';
  text: string;
  latencyMs?: number | null;
  exitIp?: string | null;
}

/**
 * Analisa uma linha de texto colada pelo usuário no formulário de proxies (ex: host:port:user:pass)
 */
export function parseProxyLine(
  rawLine: string,
  defaultType: string = 'Socks5',
): ParsedProxyItem | null {
  let str = rawLine.trim();
  if (!str) return null;

  // 1. Extrair Notas {Observação}
  let notes = '';
  const notesMatch = str.match(/\{([^}]+)\}/);
  if (notesMatch) {
    notes = notesMatch[1].trim();
    str = str.replace(notesMatch[0], '').trim();
  }

  // 2. Extrair URL de Rotação [URL]
  let rotationLink = '';
  const bracketMatches = Array.from(str.matchAll(/\[([^\]]+)\]/g));
  for (const m of bracketMatches) {
    const content = m[1];
    const isIpv6 = content.includes(':') && /^[0-9a-fA-F:]+$/.test(content);
    if (!isIpv6) {
      rotationLink = content.trim();
      str = str.replace(m[0], '').trim();
    }
  }

  // 3. Extrair Protocolo tipo://
  let pType = defaultType.toLowerCase();
  if (str.includes('://')) {
    const parts = str.split('://');
    pType = parts[0].toLowerCase().trim();
    str = parts.slice(1).join('://').trim();
  }

  // 4. Credenciais e Host/Porta
  let user = '';
  let pass = '';
  let host = '';
  let port = '';

  if (str.includes('@')) {
    const atIdx = str.lastIndexOf('@');
    const authPart = str.substring(0, atIdx);
    const hostPart = str.substring(atIdx + 1);

    const authSplit = authPart.split(':');
    user = authSplit[0] || '';
    pass = authSplit.slice(1).join(':') || '';

    if (hostPart.startsWith('[') && hostPart.includes(']:')) {
      const closeIdx = hostPart.indexOf(']:');
      host = hostPart.substring(0, closeIdx + 1);
      port = hostPart.substring(closeIdx + 2);
    } else {
      const hSplit = hostPart.split(':');
      host = hSplit[0] || '';
      port = hSplit[1] || '';
    }
  } else if (str.startsWith('[') && str.includes(']:')) {
    const closeIdx = str.indexOf(']:');
    host = str.substring(0, closeIdx + 1);
    const rest = str.substring(closeIdx + 2).split(':');
    port = rest[0] || '';
    user = rest[1] || '';
    pass = rest.slice(2).join(':') || '';
  } else {
    const parts = str.split(':');
    host = parts[0] || '';
    port = parts[1] || '';
    user = parts[2] || '';
    pass = parts[3] || '';
  }

  if (!host && !port) return null;

  const validTypes = ['socks5', 'http', 'https', 'ssh'];
  const finalType = validTypes.includes(pType.toLowerCase())
    ? pType.toLowerCase()
    : defaultType.toLowerCase();

  const isPortValid = /^\d+$/.test(port.trim()) && Number(port) >= 1 && Number(port) <= 65535;
  const isValid = host.trim().length > 0 && isPortValid;

  return {
    id: `px_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: finalType,
    host: host.trim(),
    port: port.trim(),
    user: user.trim(),
    pass: pass.trim(),
    rotationLink: rotationLink.trim(),
    notes: notes.trim(),
    outboundIp: '-',
    isValid,
    status: 'idle',
  };
}

/**
 * Traduz a resposta da API de validação do Rust (/api/proxies/test) para a UI
 */
export function formatProxyTestResult(
  res: {
    status?: string;
    latency_ms?: number | null;
    exit_ip?: string | null;
    message?: string;
  },
  hostFallback: string = '',
  options?: { verbose?: boolean },
): FormattedTestResult {
  const isVerbose = options?.verbose ?? false;
  const status = res.status;
  const pingStr = res.latency_ms ? ` (${res.latency_ms}ms)` : '';

  if (status === 'active' || status === 'success') {
    const ip = res.exit_ip || hostFallback;
    return {
      status: 'active',
      text: isVerbose ? `🟢 Conectado: ${ip}${pingStr}` : `${ip}${pingStr}`,
      latencyMs: res.latency_ms,
      exitIp: res.exit_ip,
    };
  }

  if (status === 'auth_error') {
    return {
      status: 'auth_error',
      text: isVerbose
        ? '🔴 Erro de autenticação: credenciais inválidas'
        : 'Erro autenticação',
    };
  }

  if (status === 'timeout') {
    return {
      status: 'timeout',
      text: isVerbose ? '🟡 Tempo limite esgotado' : 'Tempo esgotado',
    };
  }

  if (status === 'connection_error') {
    return {
      status: 'connection_error',
      text: isVerbose
        ? '🔴 Falha na conexão com host/porta'
        : 'Falha conexão',
    };
  }

  return {
    status: 'error',
    text: isVerbose
      ? `🔴 ${res.message || 'Erro ao testar proxy'}`
      : res.message || 'Erro',
  };
}

/**
 * Service Proxies — Gerenciamento e testes de conexões proxy junto ao backend Rust.
 */
export const serviceProxies = {
  /**
   * Consulta a lista bruta de proxies cadastrados no backend
   */
  list: async (): Promise<ProxyItem[]> => {
    const res = await http.get<any>('/api/proxies');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.Ok)) return res.Ok;
    return [];
  },

  /**
   * Carrega e formata a lista de proxies salvos para os selects da interface
   */
  listarSalvos: async (): Promise<ProxyItem[]> => {
    const res = await http.get<any>('/api/proxies');
    const list: ProxyItem[] = Array.isArray(res)
      ? res
      : res && Array.isArray(res.Ok)
        ? res.Ok
        : [];
    return list.map((p) => ({
      id: p.id,
      name: p.name || `Proxy ${p.host}`,
      type: p.type || p.proxy_type || 'socks5',
      host: p.host,
      port: String(p.port),
      user: p.user || p.username || '',
      pass: p.pass || p.password || '',
      ip: p.ip || p.host,
      country: p.country || 'BR - Brasil',
      status: p.status || 'active',
      created_at: p.created_at,
    }));
  },

  /**
   * Salva um novo proxy no banco de dados SQLite/Vault do Rust
   */
  create: (data: any) => http.post<any>('/api/proxies', data),

  /**
   * Atualiza um proxy existente no banco de dados SQLite/Vault do Rust
   */
  update: (id: string | number, data: any) =>
    http.put<any>(`/api/proxies/${id}`, data),

  /**
   * Exclui um proxy pelo ID
   */
  delete: (id: string | number) => http.delete<any>(`/api/proxies/${id}`),

  /**
   * Testa a conexão de um proxy via backend Rust (/api/proxies/test).
   */
  test: (
    data:
      | TestProxyDto
      | {
          type?: string;
          proxy_type?: string;
          host: string;
          port: number | string;
          username?: string;
          password?: string;
          user?: string;
          pass?: string;
        },
  ) => http.post<ProxyTestResult>('/api/proxies/test', data),

  /** Alias para manter compatibilidade com telas existentes */
  testar: (
    data:
      | TestProxyDto
      | {
          type?: string;
          proxy_type?: string;
          host: string;
          port: number | string;
          username?: string;
          password?: string;
          user?: string;
          pass?: string;
        },
  ) => http.post<ProxyTestResult>('/api/proxies/test', data),
};

export default serviceProxies;
