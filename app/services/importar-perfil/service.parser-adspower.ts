import type { ImportPreviewItem } from './service.types';

const EXTENSION_COOKIE_DOMAINS = ['adspower.net', 'browserext.adspower.net'];

/**
 * Decodifica bytes brutos com suporte a UTF-8, UTF-8 BOM e UTF-16 LE/BE (com ou sem BOM)
 */
export function decodeExportBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // UTF-8 com BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  // UTF-16LE com BOM
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  // UTF-16BE com BOM
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  // Heurística para UTF-16 sem BOM (Windows)
  const n = Math.min(bytes.length, 512);
  let evenNul = 0;
  let oddNul = 0;
  for (let i = 0; i < n; i++) {
    if (bytes[i] === 0) {
      if (i % 2 === 0) evenNul++;
      else oddNul++;
    }
  }

  if (evenNul + oddNul > n / 4 && n >= 2) {
    const isLe = oddNul >= evenNul;
    return new TextDecoder(isLe ? 'utf-16le' : 'utf-16be').decode(bytes);
  }

  return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
}

/**
 * Faz o parse de um bloco individual key=value
 */
export function parseBlock(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim().toLowerCase();
    const value = line.slice(eqIdx + 1).trim();
    out[key] = value;
  }
  return out;
}

/**
 * Divide o texto do AdsPower separado por linhas de asteriscos (***)
 */
export function splitRecords(text: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  const lines = text.split(/\r?\n/);
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('***') && /^(\*)+$/.test(trimmed)) {
      if (currentBlock.length > 0) {
        const parsed = parseBlock(currentBlock.join('\n'));
        if (parsed.id || parsed.name) {
          records.push(parsed);
        }
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    const parsed = parseBlock(currentBlock.join('\n'));
    if (parsed.id || parsed.name) {
      records.push(parsed);
    }
  }

  return records;
}

/**
 * Normaliza cookies JSON, removendo cookies de extensões do AdsPower
 */
export function normalizeCookies(rawJson?: string): any[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((c: any) => {
      if (!c || typeof c !== 'object') return false;
      const domain = String(c.domain || '');
      return !EXTENSION_COOKIE_DOMAINS.some((ext) => domain.includes(ext));
    }).map((c: any) => {
      const copy = { ...c };
      const sameSite = String(copy.sameSite || '').toLowerCase();
      if (sameSite === 'no_restriction' || sameSite === 'none') {
        copy.sameSite = 'None';
        copy.secure = true;
      } else if (sameSite === 'lax') {
        copy.sameSite = 'Lax';
      } else if (sameSite === 'strict') {
        copy.sameSite = 'Strict';
      } else if (sameSite === 'unspecified') {
        delete copy.sameSite;
      }
      if (copy.session) {
        delete copy.expires;
      }
      return copy;
    });
  } catch {
    return [];
  }
}

/**
 * Extrai proxy string preservando senhas com dois pontos
 */
export function parseProxyString(proxyTypeRaw?: string, proxyStrRaw?: string) {
  if (!proxyStrRaw || !proxyStrRaw.trim()) {
    return { type: undefined, host: undefined, port: undefined, user: undefined, pass: undefined };
  }

  let clean = proxyStrRaw.trim();
  let detectedType: string | undefined = undefined;

  if (clean.includes('://')) {
    const idx = clean.indexOf('://');
    detectedType = clean.slice(0, idx).toLowerCase();
    clean = clean.slice(idx + 3);
  }

  const normType = (detectedType || proxyTypeRaw || 'http').trim().toLowerCase();
  const finalType = normType.includes('socks') ? 'socks5' : normType === 'https' ? 'https' : 'http';

  if (clean.includes('@')) {
    const [authPart, hostPart] = clean.split('@');
    const [user, ...passParts] = (authPart || '').split(':');
    const [host, portStr] = (hostPart || '').split(':');
    return {
      type: finalType,
      host: host || undefined,
      port: portStr ? Number(portStr) || undefined : undefined,
      user: user || undefined,
      pass: passParts.length > 0 ? passParts.join(':') : undefined,
    };
  }

  const parts = clean.split(':');
  const host = parts[0]?.trim();
  const port = parts[1] ? Number(parts[1].trim()) || undefined : undefined;
  const user = parts[2]?.trim();
  const pass = parts.length > 3 ? parts.slice(3).join(':').trim() : undefined;

  return {
    type: finalType,
    host: host || undefined,
    port,
    user: user || undefined,
    pass: pass || undefined,
  };
}

/**
 * Converte resolução 1680*1050 ou 1920x1080 em width/height
 */
export function parseResolution(resStr?: string): { width?: number; height?: number } {
  if (!resStr) return {};
  const clean = resStr.replace(/[*_]/g, 'x');
  const [wStr, hStr] = clean.split('x');
  const width = wStr ? Number(wStr.trim()) || undefined : undefined;
  const height = hStr ? Number(hStr.trim()) || undefined : undefined;
  return { width, height };
}

/**
 * Mapeia um registro em Item de Pré-visualização
 */
export function mapRecordToPreviewItem(record: Record<string, string>): ImportPreviewItem {
  const name = record.name || record.id || 'Perfil Sem Nome';
  const group = record.group && record.group !== '0' ? record.group : undefined;
  const notes = record.remark || record.notes || undefined;
  const username = record.username || undefined;
  const password = record.password || undefined;
  const twofa = record.fakey || record.twofa || undefined;
  const userAgent = record.ua || record.useragent || undefined;

  const proxy = parseProxyString(record.proxytype, record.proxy);
  const cookies = normalizeCookies(record.cookie);
  const res = parseResolution(record.resolution);

  return {
    id: record.id,
    name,
    group,
    notes,
    username,
    password,
    twofa,
    user_agent: userAgent,
    proxy_type: proxy.type,
    proxy_host: proxy.host,
    proxy_port: proxy.port,
    proxy_username: proxy.user,
    proxy_password: proxy.pass,
    screen_width: res.width,
    screen_height: res.height,
    cookies,
    cookieCount: cookies.length,
    rawRecord: record,
    status: 'valid',
  };
}

/**
 * Parser central de texto AdsPower
 */
export function parseAdsPowerText(text: string): ImportPreviewItem[] {
  const records = splitRecords(text);
  return records.map(mapRecordToPreviewItem);
}
