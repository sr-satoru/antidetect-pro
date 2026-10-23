import firefoxPresetsData from '@presets/firefox/fingerprint-presets-v150.json';
import firefoxFontsData from '@presets/firefox/fonts.json';
import mediaDevicesData from '@presets/common/media-devices.json';
import voiceManifestsData from '@presets/common/voices.json';
import chromiumPresetsData from '@presets/chromium/fingerprint-presets.json';
import chromiumGpusData from '@presets/chromium/gpus.json';
import chromiumFontsData from '@presets/chromium/fonts.json';
import userAgentsData from '@presets/common/user-agents.json';
import androidPresetsData from '@presets/android/fingerprint-presets.json';
import androidDevicesData from '@presets/android/devices.json';
import androidUserAgentsData from '@presets/android/user-agents.json';

export type SupportedOS = 'windows' | 'macos' | 'linux' | 'android';
export type SupportedKernel = 'AstroFox' | 'AstroBrowser';

export interface BrowserRawPreset {
  id?: string;
  kernel?: string;
  browserVersion?: string;
  fingerprintSeed?: string;
  navigator: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    maxTouchPoints: number;
    deviceMemory?: number;
    userAgentData?: any;
  };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    devicePixelRatio: number;
  };
  webgl: {
    unmaskedVendor: string;
    unmaskedRenderer: string;
  };
  speechVoices?: string[];
}

export interface GpuOption {
  vendor: string;
  renderer: string;
  label: string;
}

export interface ScreenOption {
  label: string;
  width: number;
  height: number;
  dpr: number;
}

export interface MediaOption {
  mics: string[];
  outs: string[];
  camera: string;
}

export interface CoherentPreset {
  os: SupportedOS;
  osVersion: string;
  platform: string;
  userAgent: string;
  cpuCores: number;
  maxTouchPoints: number;
  customScreenWidth: number;
  customScreenHeight: number;
  availWidth: number;
  availHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  webglVendor: string;
  webglRenderer: string;
  media: MediaOption;
  speechVoices: string[];
  canvasSeed: string;
  webglSeed: string;
  audioSeed: string;
  clientRectsSeed: string;
  kernel?: string;
  kernelVersion?: string;
  deviceMemory?: number;
  userAgentData?: any;
}

/**
 * Identifica se o motor selecionado pertence ao ecossistema Chromium (AstroBrowser)
 */
export function isChromiumKernel(kernel?: string): boolean {
  if (!kernel) return false;
  const k = kernel.toLowerCase();
  return k.includes('astrobrowser') || k.includes('chrom') || k.includes('blink') || k.includes('sun');
}

/**
 * Normaliza o identificador de SO para as chaves nativas (windows, macos, linux, android)
 */
export function normalizeOsKey(os?: string): SupportedOS {
  const clean = (os || '').toLowerCase();
  if (clean.includes('android')) return 'android';
  if (clean.includes('win')) return 'windows';
  if (clean.includes('mac') || clean.includes('darwin') || clean.includes('apple')) return 'macos';
  return 'linux';
}

/**
 * Mapeia o SO para a chave curta de media-devices.json e fonts.json ('win', 'mac', 'lin')
 */
export function normalizeShortOs(os?: string): 'win' | 'mac' | 'lin' {
  const norm = normalizeOsKey(os);
  if (norm === 'windows') return 'win';
  if (norm === 'macos') return 'mac';
  return 'lin';
}

/**
 * Retorna os presets reais de acordo com o SO e o motor selecionado
 */
export function getPresetsByOs(os?: string, kernel?: string): BrowserRawPreset[] {
  const key = normalizeOsKey(os);
  if (key === 'android') {
    return (androidPresetsData as any).presets || [];
  }
  if (isChromiumKernel(kernel)) {
    const catalog = (chromiumPresetsData as any).presets as Record<string, BrowserRawPreset[]>;
    return catalog[key] || catalog['windows'] || [];
  }
  const catalog = (firefoxPresetsData as any).presets as Record<string, BrowserRawPreset[]>;
  return catalog[key] || catalog['windows'] || [];
}

/**
 * Extrai a lista de placas de vídeo (WebGL) reais conforme SO e motor (Chromium vs Firefox)
 */
export function getGpuOptions(os?: string, kernel?: string): GpuOption[] {
  const key = normalizeOsKey(os);
  const seen = new Set<string>();
  const gpus: GpuOption[] = [];

  const addGpu = (vendor: string, renderer: string, label?: string) => {
    const cleanRenderer = renderer.replace(/, or similar$/i, '').trim();
    const signature = `${vendor}:::${cleanRenderer}`;
    if (!seen.has(signature) && cleanRenderer) {
      seen.add(signature);
      gpus.push({
        vendor,
        renderer: cleanRenderer,
        label: label || `${cleanRenderer} (${vendor})`,
      });
    }
  };

  if (key === 'android') {
    const devs = (androidDevicesData as any).devices || [];
    for (const d of devs) {
      if (d.webgl) {
        addGpu(d.webgl.vendor, d.webgl.renderer, `${d.model} - ${d.webgl.renderer}`);
      }
    }
    return gpus;
  }

  if (isChromiumKernel(kernel)) {
    // 1. Catálogo estruturado de GPUs do Chromium / Clearcote
    if (key === 'macos') {
      const appleGpus = (chromiumGpusData as any).apple || [];
      for (const item of appleGpus) {
        addGpu(item.vendor, item.renderer, `${item.model} (${item.vendor})`);
      }
    } else {
      const nvidiaGpus = (chromiumGpusData as any).nvidia || [];
      const integratedGpus = (chromiumGpusData as any).integrated || [];
      const isWin = key === 'windows';

      for (const item of nvidiaGpus) {
        const rend = isWin ? item.rendererWindows : item.rendererLinux;
        if (rend) addGpu(item.vendor, rend, `${item.model} (${item.vendor})`);
      }
      for (const item of integratedGpus) {
        const rend = isWin ? item.rendererWindows : item.rendererLinux;
        if (rend) addGpu(item.vendor, rend, `${item.model} (${item.vendor})`);
      }
    }

    // 2. Extrai também as observadas nos presets de Chromium
    const presets = getPresetsByOs(os, kernel);
    for (const p of presets) {
      if (p.webgl?.unmaskedRenderer) {
        addGpu(p.webgl.unmaskedVendor, p.webgl.unmaskedRenderer);
      }
    }
  } else {
    // Modo AstroFox (Firefox)
    const presets = getPresetsByOs(os, kernel);
    for (const p of presets) {
      if (!p.webgl?.unmaskedRenderer) continue;
      addGpu(p.webgl.unmaskedVendor, p.webgl.unmaskedRenderer);
    }
  }

  return gpus;
}

/**
 * Retorna todos os User-Agents reais diretamente dos presets oficiais de cada motor
 * complementados pelas 2-3 versões estáveis recentes para manter alta variedade e coerência.
 */
export function getUserAgents(os?: string, kernel?: string, category?: string): string[] {
  const key = normalizeOsKey(os);
  const uas = new Set<string>();

  // 1. Catálogo curado das 2-3 versões estáveis recentes
  if (key === 'android') {
    const list = (androidUserAgentsData as any).chromium || [];
    for (const u of list) uas.add(u);
    return Array.from(uas);
  }

  const cat = category?.toLowerCase();
  const isChromeCategory = cat === 'chrome' || cat === 'chromium';
  const isFirefoxCategory = cat === 'firefox';

  if (isChromeCategory) {
    const list = (userAgentsData as any).chromium?.[key] || [];
    for (const u of list) uas.add(u);
    const presets = getPresetsByOs(os, 'AstroBrowser');
    for (const p of presets) {
      if (p.navigator?.userAgent) {
        uas.add(p.navigator.userAgent);
      }
    }
  } else if (isFirefoxCategory) {
    const list = (userAgentsData as any).firefox?.[key] || [];
    for (const u of list) uas.add(u);
    const presets = getPresetsByOs(os, 'AstroFox');
    for (const p of presets) {
      if (p.navigator?.userAgent) {
        uas.add(p.navigator.userAgent);
      }
    }
  } else {
    // "Todo" ou padrão: respeita o motor (AstroBrowser vs AstroFox)
    if (isChromiumKernel(kernel)) {
      const list = (userAgentsData as any).chromium?.[key] || [];
      for (const u of list) uas.add(u);
      const presets = getPresetsByOs(os, 'AstroBrowser');
      for (const p of presets) {
        if (p.navigator?.userAgent) {
          uas.add(p.navigator.userAgent);
        }
      }
    } else {
      const list = (userAgentsData as any).firefox?.[key] || [];
      for (const u of list) uas.add(u);
      const presets = getPresetsByOs(os, 'AstroFox');
      for (const p of presets) {
        if (p.navigator?.userAgent) {
          uas.add(p.navigator.userAgent);
        }
      }
    }
  }

  return Array.from(uas);
}

/**
 * Retorna resoluções de tela e DPRs reais diretamente dos presets do motor selecionado
 */
export function getScreenResolutions(os?: string, kernel?: string): ScreenOption[] {
  const presets = getPresetsByOs(os, kernel);
  const seen = new Set<string>();
  const screens: ScreenOption[] = [];

  for (const p of presets) {
    if (!p.screen?.width || !p.screen?.height) continue;
    const w = p.screen.width;
    const h = p.screen.height;
    const dpr = p.screen.devicePixelRatio;
    const sig = `${w}x${h}@${dpr}`;

    if (!seen.has(sig)) {
      seen.add(sig);
      screens.push({
        width: w,
        height: h,
        dpr,
        label: `${w} × ${h} (DPR ${dpr})`,
      });
    }
  }

  screens.sort((a, b) => b.width - a.width);
  return screens;
}

/**
 * Retorna os dispositivos de mídia reais diretamente do catálogo comum
 */
export function getMediaDevicesForOs(os?: string) {
  const key = normalizeOsKey(os);
  if (key === 'android') {
    return {
      cards: [{ w: 1, mics: ['Default'], outs: ['Default'] }],
      cameras: [
        { w: 1, cam: 'camera2 0, facing back', mic: 'Default' },
        { w: 1, cam: 'camera2 1, facing front', mic: 'Default' },
      ],
    };
  }
  const shortKey = normalizeShortOs(os);
  const data = (mediaDevicesData as any)[shortKey];
  return {
    cards: (data?.cards || []) as Array<{ w: number; mics: string[]; outs: string[] }>,
    cameras: (data?.cameras || []) as Array<{ w: number; cam: string; mic: string | null }>,
  };
}

/**
 * Retorna a lista de fontes reais diretamente do JSON do motor selecionado
 */
export function getFontsForOs(os?: string, kernel?: string): string[] {
  const key = normalizeOsKey(os);
  if (key === 'android') {
    return ['Roboto', 'Noto Sans', 'Droid Sans', 'Roboto Regular', 'Roboto Medium'];
  }
  if (isChromiumKernel(kernel)) {
    return (chromiumFontsData as any)[key] || [];
  }
  const shortKey = normalizeShortOs(os);
  return (firefoxFontsData as any)[shortKey] || [];
}

/**
 * Retorna o manifesto de vozes de fala diretamente do catálogo comum
 */
export function getVoiceManifestForOs(os?: string) {
  const key = normalizeOsKey(os);
  if (key === 'android') {
    return [];
  }
  const shortKey = normalizeShortOs(os);
  return (voiceManifestsData as any)[shortKey];
}

/**
 * Gera semente hexadecimal aleatória de 8 caracteres (ex: '3FA8C912')
 */
export function generateRandomHexSeed(): string {
  const val = Math.floor(Math.random() * 0xffffffff);
  return val.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Sorteia uma máquina real e completa diretamente dos presets oficiais do motor e SO.
 * Zero dados inventados: todos os parâmetros são estritamente retirados da base física autêntica.
 */
export function getRandomPreset(os?: string, kernel?: string): CoherentPreset {
  const key = normalizeOsKey(os);
  const isChromium = isChromiumKernel(kernel) || key === 'android';
  const effectiveKernel = isChromium ? 'AstroBrowser' : 'AstroFox';
  const presets = getPresetsByOs(key, effectiveKernel);
  const raw = presets[Math.floor(Math.random() * presets.length)];

  // Sorteia um User-Agent recente coerente para o SO e motor
  const availableUas = getUserAgents(key, effectiveKernel);
  let matchingUas = availableUas;
  if (key === 'android' && (raw as any).deviceModel) {
    const model = (raw as any).deviceModel;
    const modelFiltered = availableUas.filter(
      (u) => u.includes(model) || u.includes('Android 10; K'),
    );
    if (modelFiltered.length > 0) {
      matchingUas = modelFiltered;
    }
  }
  const selectedUa = matchingUas.length > 0
    ? matchingUas[Math.floor(Math.random() * matchingUas.length)]
    : raw.navigator.userAgent;

  // Extrai versão major para manter Client Hints e Kernel coerentes
  let majorVersion = raw.browserVersion || '150';
  if (isChromium) {
    const m = selectedUa.match(/Chrome\/(\d+)\./);
    if (m) majorVersion = m[1];
  } else {
    const m = selectedUa.match(/rv:(\d+)\./);
    if (m) majorVersion = m[1];
  }

  let osVersion = 'Linux x86_64';
  if (key === 'windows') {
    osVersion = 'Windows NT 10.0; Win64; x64';
  } else if (key === 'macos') {
    osVersion = isChromium ? 'Macintosh; Intel Mac OS X 10_15_7' : 'Intel Mac OS X 10.15';
  } else if (key === 'android') {
    osVersion = 'Linux armv8l (Android 14)';
  }

  let userAgentData = raw.navigator.userAgentData;
  if (userAgentData && Array.isArray(userAgentData.brands)) {
    userAgentData = {
      ...userAgentData,
      brands: userAgentData.brands.map((b: any) =>
        b.brand.toLowerCase().includes('not') ? b : { ...b, version: majorVersion }
      ),
    };
  }

  const devData = getMediaDevicesForOs(key);
  const card = devData.cards[Math.floor(Math.random() * devData.cards.length)];
  const cam = devData.cameras[Math.floor(Math.random() * devData.cameras.length)]?.cam || '';

  const cleanRenderer = raw.webgl.unmaskedRenderer.replace(/, or similar$/i, '').trim();

  return {
    os: key,
    osVersion,
    platform: raw.navigator.platform,
    userAgent: selectedUa,
    cpuCores: raw.navigator.hardwareConcurrency,
    maxTouchPoints: raw.navigator.maxTouchPoints,
    deviceMemory: raw.navigator.deviceMemory,
    userAgentData,
    customScreenWidth: raw.screen.width,
    customScreenHeight: raw.screen.height,
    availWidth: raw.screen.availWidth,
    availHeight: raw.screen.availHeight,
    devicePixelRatio: raw.screen.devicePixelRatio,
    colorDepth: raw.screen.colorDepth,
    webglVendor: raw.webgl.unmaskedVendor,
    webglRenderer: cleanRenderer,
    media: {
      mics: card?.mics || [],
      outs: card?.outs || [],
      camera: cam,
    },
    speechVoices: raw.speechVoices || [],
    canvasSeed: generateRandomHexSeed(),
    webglSeed: generateRandomHexSeed(),
    audioSeed: generateRandomHexSeed(),
    clientRectsSeed: generateRandomHexSeed(),
    kernel: effectiveKernel,
    kernelVersion: majorVersion,
  };
}

/**
 * Retorna os núcleos de CPU (hardwareConcurrency) reais observados nos presets oficiais
 */
export function getCpuCoreOptions(os?: string, kernel?: string): number[] {
  const presets = getPresetsByOs(os, kernel);
  const cores = new Set<number>();
  for (const p of presets) {
    if (p.navigator?.hardwareConcurrency) {
      cores.add(p.navigator.hardwareConcurrency);
    }
  }
  return Array.from(cores).sort((a, b) => a - b);
}
