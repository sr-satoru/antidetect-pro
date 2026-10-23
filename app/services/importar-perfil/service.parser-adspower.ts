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
 * Detecta o motor de navegação correspondente (AstroBrowser / AstroFox)
 */
export function detectKernel(record: Record<string, string>): string {
  for (const key of ['kernel', 'engine', 'browsertype', 'core']) {
    const val = record[key];
    if (val && val.trim()) {
      const lower = val.toLowerCase();
      if (lower.includes('flower') || lower.includes('fox') || lower.includes('gecko')) {
        return 'AstroFox';
      }
      if (lower.includes('sun') || lower.includes('chrom') || lower.includes('blink') || lower.includes('clear')) {
        return 'AstroBrowser';
      }
    }
  }

  const ua = (record.ua || record.useragent || '').toLowerCase();
  if (ua.includes('firefox') || ua.includes('fxios') || (ua.includes('gecko/') && !ua.includes('like gecko'))) {
    return 'AstroFox';
  }
  if (ua.includes('chrome') || ua.includes('chromium') || ua.includes('crios') || ua.includes('edg') || ua.includes('opr')) {
    return 'AstroBrowser';
  }

  return 'AstroBrowser';
}

/**
 * Detecta o sistema operacional do perfil
 */
export function detectOs(record: Record<string, string>): string {
  for (const key of ['platform_os', 'os', 'operatingsystem', 'platformos']) {
    const val = record[key];
    if (val && val.trim()) {
      const lower = val.toLowerCase();
      if (lower.includes('win')) return 'windows';
      if (lower.includes('mac') || lower.includes('darwin') || lower.includes('ios') || lower.includes('iphone') || lower.includes('ipad')) return 'macos';
      if (lower.includes('linux') || lower.includes('android')) return 'linux';
    }
  }

  const ua = (record.ua || record.useragent || '').toLowerCase();
  if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64')) return 'windows';
  if (ua.includes('mac os') || ua.includes('macintosh') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('darwin')) return 'macos';
  if (ua.includes('linux') || ua.includes('android') || ua.includes('x11')) return 'linux';

  return 'windows';
}

/**
 * Extrai a versão principal do navegador do User-Agent
 */
export function detectBrowserVersion(record: Record<string, string>): string {
  const ua = record.ua || record.useragent || '';
  for (const prefix of ['Chrome/', 'Chromium/', 'Firefox/', 'FxiOS/', 'Version/']) {
    const pos = ua.indexOf(prefix);
    if (pos !== -1) {
      const rest = ua.slice(pos + prefix.length);
      const digits = rest.match(/^\d+/)?.[0];
      if (digits) return digits;
    }
  }
  return '150';
}

/**
 * Formata o nome de exibição de uma plataforma
 */
export function formatPlatformName(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('facebook')) return 'Facebook';
  if (lower.includes('tiktok')) return 'TikTok';
  if (lower.includes('twitter') || lower.includes('x.com')) return 'X (Twitter)';
  if (lower.includes('google') || lower.includes('gmail')) return 'Google';
  if (lower.includes('amazon')) return 'Amazon';
  if (lower.includes('shopee')) return 'Shopee';
  if (lower.includes('mercado')) return 'Mercado Livre';
  if (lower.includes('discord')) return 'Discord';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Resolve a chave canônica da plataforma e o domínio correspondente
 */
export function resolvePlatformKeyAndDomain(raw?: string, tab?: string): { platform: string; customDomain: string; displayName: string } {
  const p = (raw || '').trim().toLowerCase();
  const t = (tab || '').trim().toLowerCase();
  const combined = `${p} ${t}`;

  if (combined.includes('instagram')) {
    return { platform: 'instagram', customDomain: 'instagram.com', displayName: 'Instagram' };
  }
  if (combined.includes('facebook') || combined.includes('fb.com') || combined.includes('meta')) {
    return { platform: 'facebook', customDomain: 'facebook.com', displayName: 'Facebook' };
  }
  if (combined.includes('tiktok')) {
    return { platform: 'tiktok', customDomain: 'tiktok.com', displayName: 'TikTok' };
  }
  if (combined.includes('twitter') || combined.includes('x.com') || p === 'x') {
    return { platform: 'x', customDomain: 'x.com', displayName: 'X (Twitter)' };
  }
  if (combined.includes('google') || combined.includes('gmail')) {
    return { platform: 'google', customDomain: 'accounts.google.com', displayName: 'Google' };
  }
  if (combined.includes('amazon')) {
    return { platform: 'amazon', customDomain: 'amazon.com', displayName: 'Amazon' };
  }
  if (combined.includes('linkedin')) {
    return { platform: 'linkedin', customDomain: 'linkedin.com', displayName: 'LinkedIn' };
  }
  if (combined.includes('paypal')) {
    return { platform: 'paypal', customDomain: 'paypal.com', displayName: 'PayPal' };
  }
  if (combined.includes('outlook') || combined.includes('hotmail')) {
    return { platform: 'outlook', customDomain: 'outlook.com', displayName: 'Outlook' };
  }
  if (combined.includes('vinted')) {
    return { platform: 'vinted', customDomain: 'vinted.fr', displayName: 'Vinted' };
  }
  if (combined.includes('ebay')) {
    return { platform: 'ebay', customDomain: 'ebay.com', displayName: 'eBay' };
  }
  if (combined.includes('discord')) {
    return { platform: 'discord', customDomain: 'discord.com', displayName: 'Discord' };
  }
  if (combined.includes('telegram')) {
    return { platform: 'telegram', customDomain: 'telegram.org', displayName: 'Telegram' };
  }
  if (combined.includes('shopee')) {
    return { platform: 'shopee', customDomain: 'shopee.com', displayName: 'Shopee' };
  }
  if (combined.includes('mercado')) {
    return { platform: 'mercadolivre', customDomain: 'mercadolivre.com.br', displayName: 'Mercado Livre' };
  }
  if (p) {
    const domain = p.includes('.') ? p : `${p}.com`;
    return { platform: p, customDomain: domain, displayName: formatPlatformName(p) };
  }
  return { platform: '', customDomain: '', displayName: '' };
}

/**
 * Identifica a plataforma / rede social
 */
export function detectPlatform(record: Record<string, string>): string | undefined {
  const resolved = resolvePlatformKeyAndDomain(record.platform, record.tab);
  return resolved.platform || undefined;
}

/**
 * Capta o nome do perfil do txt; se name= estiver vazio, adota o username do txt
 */
export function detectProfileName(record: Record<string, string>, _detectedPlatform?: string): string {
  if (record.name && record.name.trim()) return record.name.trim();
  if (record.username && record.username.trim()) return record.username.trim();
  if (record.id && record.id.trim()) return record.id.trim();
  if (record.acc_id && record.acc_id.trim()) return `Perfil #${record.acc_id.trim()}`;
  return 'Perfil AdsPower';
}

/**
 * Remove aspas envoltórias de senhas
 */
export function cleanPassword(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
    || (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Extrai abas de sessão / URLs iniciais
 */
export function extractInitialUrls(record: Record<string, string>): string[] {
  const urls: string[] = [];
  if (record.tab && record.tab.trim()) {
    for (const item of record.tab.split(',')) {
      const trimmed = item.trim();
      if (!trimmed || trimmed.startsWith('about:sessionrestore') || trimmed === 'about:blank') {
        continue;
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        if (!urls.includes(trimmed)) {
          urls.push(trimmed);
        }
      }
    }
  }
  return urls;
}

/**
 * Mapeia um registro em Item de Pré-visualização com auto-detecção rica
 */
export function mapRecordToPreviewItem(record: Record<string, string>): ImportPreviewItem {
  const detectedKernel = detectKernel(record);
  const detectedOs = detectOs(record);
  const detectedVersion = detectBrowserVersion(record);
  const detectedPlatform = detectPlatform(record);
  const name = detectProfileName(record, detectedPlatform);

  const group = record.group && record.group !== '0' ? record.group : undefined;
  const notes = record.remark || record.notes || undefined;
  const username = record.username || undefined;
  const password = cleanPassword(record.password);
  const twofa = record.fakey || record.twofa || undefined;
  const userAgent = record.ua || record.useragent || undefined;

  const proxy = parseProxyString(record.proxytype, record.proxy);
  const cookies = normalizeCookies(record.cookie);
  const res = parseResolution(record.resolution);
  const initialUrls = extractInitialUrls(record);

  return {
    id: record.id,
    name,
    group,
    notes,
    username,
    password,
    twofa,
    kernel: detectedKernel,
    os: detectedOs,
    platform: detectedPlatform,
    browser_version: detectedVersion,
    initial_urls: initialUrls.length > 0 ? initialUrls : undefined,
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
 * Parser de texto com suporte automático a AdsPower (linhas ***), JSON e CSV
 */
export function parseAdsPowerText(text: string): ImportPreviewItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 1. Tenta parse como JSON (array de perfis ou objeto contendo lista)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : parsed.list || parsed.profiles || parsed.data || [parsed];
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any) => {
          const flatMap: Record<string, string> = {};
          for (const [k, v] of Object.entries(item)) {
            if (v !== null && v !== undefined) {
              flatMap[k.toLowerCase()] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            }
          }
          return mapRecordToPreviewItem(flatMap);
        });
      }
    } catch {
      // Segue para outros formatos se JSON falhar
    }
  }

  // 2. Parser padrão AdsPower delimitado por asteriscos (***)
  const records = splitRecords(text);
  if (records.length > 0) {
    return records.map(mapRecordToPreviewItem);
  }

  return [];
}

