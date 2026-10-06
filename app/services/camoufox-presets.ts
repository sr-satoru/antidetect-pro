import presetsData from '@presets/fingerprint-presets-v150.json';
import mediaDevicesData from '@presets/media-devices.json';
import fontsData from '@presets/fonts.json';
import voiceManifestsData from '@presets/voice-manifests.json';

export type SupportedOS = 'windows' | 'macos' | 'linux';

export interface CamoufoxRawPreset {
  navigator: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    maxTouchPoints: number;
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
}

/**
 * Normaliza o identificador de SO para as chaves nativas do Camoufox (windows, macos, linux)
 */
export function normalizeOsKey(os?: string): SupportedOS {
  const clean = (os || '').toLowerCase();
  if (clean.includes('win')) return 'windows';
  if (clean.includes('mac') || clean.includes('darwin') || clean.includes('apple')) return 'macos';
  return 'linux';
}

/**
 * Mapeia o SO para a chave exata de media-devices.json e fonts.json ('win', 'mac', 'lin')
 */
export function normalizeShortOs(os?: string): 'win' | 'mac' | 'lin' {
  const norm = normalizeOsKey(os);
  if (norm === 'windows') return 'win';
  if (norm === 'macos') return 'mac';
  return 'lin';
}

/**
 * Retorna os presets reais diretamente do JSON oficial do Camoufox
 */
export function getPresetsByOs(os?: string): CamoufoxRawPreset[] {
  const key = normalizeOsKey(os);
  const catalog = presetsData.presets as Record<string, CamoufoxRawPreset[]>;
  return catalog[key] || catalog['windows'] || [];
}

/**
 * Extrai a lista de placas de vídeo (WebGL) reais diretamente do JSON do Camoufox
 */
export function getGpuOptions(os?: string): GpuOption[] {
  const presets = getPresetsByOs(os);
  const seen = new Set<string>();
  const gpus: GpuOption[] = [];

  for (const p of presets) {
    if (!p.webgl || !p.webgl.unmaskedRenderer) continue;
    const vendor = p.webgl.unmaskedVendor;
    const renderer = p.webgl.unmaskedRenderer.replace(/, or similar$/i, '').trim();
    const signature = `${vendor}:::${renderer}`;

    if (!seen.has(signature)) {
      seen.add(signature);
      gpus.push({
        vendor,
        renderer,
        label: `${renderer} (${vendor})`,
      });
    }
  }

  return gpus;
}

/**
 * Retorna todos os User-Agents reais de Firefox diretamente do JSON do Camoufox
 */
export function getUserAgents(os?: string): string[] {
  const presets = getPresetsByOs(os);
  const uas = new Set<string>();

  for (const p of presets) {
    if (p.navigator?.userAgent) {
      uas.add(p.navigator.userAgent);
    }
  }

  return Array.from(uas);
}

/**
 * Retorna resoluções de tela e DPRs reais diretamente do JSON do Camoufox
 */
export function getScreenResolutions(os?: string): ScreenOption[] {
  const presets = getPresetsByOs(os);
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
 * Retorna os dispositivos de mídia reais diretamente do JSON do Camoufox
 */
export function getMediaDevicesForOs(os?: string) {
  const shortKey = normalizeShortOs(os);
  const data = (mediaDevicesData as any)[shortKey];
  return {
    cards: (data?.cards || []) as Array<{ w: number; mics: string[]; outs: string[] }>,
    cameras: (data?.cameras || []) as Array<{ w: number; cam: string; mic: string | null }>,
  };
}

/**
 * Retorna a lista de fontes reais diretamente do JSON do Camoufox
 */
export function getFontsForOs(os?: string): string[] {
  const shortKey = normalizeShortOs(os);
  return (fontsData as any)[shortKey] || [];
}

/**
 * Retorna o manifesto de vozes de fala diretamente do JSON do Camoufox
 */
export function getVoiceManifestForOs(os?: string) {
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
 * Sorteia uma máquina real e completa diretamente do JSON do Camoufox.
 * Zero dados inventados: todos os parâmetros são estritamente retirados
 * da máquina física selecionada no JSON oficial.
 */
export function getRandomPreset(os?: string): CoherentPreset {
  const key = normalizeOsKey(os);
  const presets = getPresetsByOs(key);
  const raw = presets[Math.floor(Math.random() * presets.length)];

  const devData = getMediaDevicesForOs(key);
  const card = devData.cards[Math.floor(Math.random() * devData.cards.length)];
  const cam = devData.cameras[Math.floor(Math.random() * devData.cameras.length)]?.cam || '';

  const cleanRenderer = raw.webgl.unmaskedRenderer.replace(/, or similar$/i, '').trim();

  const osVersion = key === 'windows'
    ? 'Windows NT 10.0; Win64; x64'
    : key === 'macos'
    ? 'Intel Mac OS X 10.15'
    : 'Linux x86_64';

  return {
    os: key,
    osVersion,
    platform: raw.navigator.platform,
    userAgent: raw.navigator.userAgent,
    cpuCores: raw.navigator.hardwareConcurrency,
    maxTouchPoints: raw.navigator.maxTouchPoints,
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
  };
}

/**
 * Retorna os núcleos de CPU (hardwareConcurrency) reais observados nos presets oficiais
 */
export function getCpuCoreOptions(os?: string): number[] {
  const presets = getPresetsByOs(os);
  const cores = new Set<number>();
  for (const p of presets) {
    if (p.navigator?.hardwareConcurrency) {
      cores.add(p.navigator.hardwareConcurrency);
    }
  }
  return Array.from(cores).sort((a, b) => a - b);
}
