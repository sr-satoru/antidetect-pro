/**
 * Utilitários compartilhados para manipulação, validação e teste de proxies.
 */

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
 * Valida se um host é um IPv4 válido, IPv6 ou hostname/domínio válido.
 */
export function isValidHostAddress(host: string): boolean {
  const clean = host.trim().replace(/^\[|\]$/g, '');
  if (!clean) return false;

  // 1. IPv4 (4 números de 0 a 255)
  const ipv4Parts = clean.split('.');
  if (ipv4Parts.length === 4) {
    const isIpv4 = ipv4Parts.every((part) => {
      if (!/^\d+$/.test(part)) return false;
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
    if (isIpv4) return true;
  }

  // 2. IPv6 (contém múltiplos colons e caracteres hexadecimais)
  if (clean.includes(':') && /^[0-9a-fA-F:]+$/.test(clean)) {
    return true;
  }

  // 3. Nome de domínio / hostname válido ou localhost
  if (
    /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(clean) ||
    clean.toLowerCase() === 'localhost'
  ) {
    return true;
  }

  return false;
}

/**
 * Valida se uma porta está no intervalo permitido (1..65535).
 */
export function isValidPortNumber(port: string): boolean {
  if (!/^\d+$/.test(port.trim())) return false;
  const num = parseInt(port.trim(), 10);
  return num >= 1 && num <= 65535;
}

/**
 * Analisa uma linha de texto e extrai as propriedades do proxy.
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

  // 2. Extrair URL de Rotação [Mudar o URL IP] se não for o host IPv6
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

  const isHostValid = isValidHostAddress(host);
  const isPortValid = isValidPortNumber(port);
  const isValid = isHostValid && isPortValid;

  return {
    id: Math.random().toString(36).substring(2, 9),
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
 * Traduz a resposta da API de validação do Rust para um formato de UI amigável.
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
