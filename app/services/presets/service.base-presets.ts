import defaultBasePresetData from '@/config/default-base-preset.json';
import { getRandomPreset, SupportedOS, SupportedKernel } from '@/services/navegador-presets';
import { generateDeviceName, generateMacAddress } from '@/components/criar-perfil/impressoes';

export interface BaseBrowserPreset {
  id: string;
  name: string;
  description: string;
  defaultOS: SupportedOS;
  defaultKernel: SupportedKernel;
  kernelVersion: string;
  group: string;
  tags: string[];
  proxyMode: string;
  proxyType: string;
  proxyHost: string;
  proxyPort: string;
  proxyUser: string;
  proxyPass: string;
  proxyRotationUrl: string;
  ipChecker: string;
  socksRemoteDns: boolean;
  platformUrl: string;
  platformAccounts: any[];
  duplicateCheckRules: {
    usernamePassword: boolean;
    cookie: boolean;
    cUser: boolean;
  };
  openTabsUrls: string;
  cpuMode: string;
  cpuCores: number;
  webrtcMode: string;
  timezoneMode: string;
  customTimezone: string;
  locationMode: string;
  locationPermission: string;
  customLatitude: string;
  customLongitude: string;
  customAccuracy: number;
  displayLanguageMode: string;
  screenResolutionMode: string;
  screenResolution: string;
  customScreenWidth: number;
  customScreenHeight: number;
  devicePixelRatio: number;
  fontsMode: string;
  colorDepth: number;
  languageMode: string;
  customLanguage: string;
  audioSampleRate: number;
  hardwareNoise: {
    canvas: boolean;
    webglImage: boolean;
    audioContext: boolean;
    mediaDevices: boolean;
    clientRects: boolean;
    speechVoices: boolean;
    fontPack: boolean;
    fontMetrics: boolean;
  };
  webglMetadataMode: string;
  webgpuMode: string;
  ramMode: string;
  ramGb: number;
  deviceNameMode: string;
  macAddressMode: string;
  doNotTrackMode: string;
  doNotTrack: string;
  portScanProtection: string;
  portScanAllowedPorts: string;
  hardwareAcceleration: string;
  disableTlsFeatures: string;
  batteryMode: string;
  globalPrivacyControl: boolean;
  memorySaver: boolean;
  dnsBlocklist: string;
  ephemeral: boolean;
  enablePassword: boolean;
  password: string;
  launchHook: string;
  extensionMode: string;
  extensionCategory: string;
  extensions: any[];
}

const STORAGE_KEY = 'star_active_base_preset';

export const serviceBasePresets = {
  /**
   * Obtém o preset base ativo configurado pelo usuário,
   * utilizando o arquivo default-base-preset.json como modelo padrão de fábrica.
   */
  getActivePreset(): BaseBrowserPreset {
    try {
      const storage = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : (typeof globalThis !== 'undefined' && (globalThis as any).localStorage ? (globalThis as any).localStorage : null);
      if (storage) {
        const saved = storage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...(defaultBasePresetData as unknown as BaseBrowserPreset),
            ...parsed,
          };
        }
      }
    } catch {
      // Falha silenciosa em ambientes sem localStorage
    }
    return defaultBasePresetData as unknown as BaseBrowserPreset;
  },

  /**
   * Salva o preset base ativo modificado no localStorage
   */
  saveActivePreset(preset: BaseBrowserPreset): void {
    try {
      const storage = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : (typeof globalThis !== 'undefined' && (globalThis as any).localStorage ? (globalThis as any).localStorage : null);
      if (storage) {
        storage.setItem(STORAGE_KEY, JSON.stringify(preset, null, 2));
      }
    } catch {}
  },

  /**
   * Restaura o preset base ativo para os padrões oficiais de fábrica
   */
  resetToDefaults(): BaseBrowserPreset {
    try {
      const storage = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : (typeof globalThis !== 'undefined' && (globalThis as any).localStorage ? (globalThis as any).localStorage : null);
      if (storage) {
        storage.removeItem(STORAGE_KEY);
      }
    } catch {}
    return defaultBasePresetData as unknown as BaseBrowserPreset;
  },

  /**
   * Exporta o preset como string formatada em JSON
   */
  exportPresetJson(preset?: BaseBrowserPreset): string {
    const target = preset || this.getActivePreset();
    return JSON.stringify(target, null, 2);
  },

  /**
   * Valida e importa um preset a partir de uma string JSON
   */
  importPresetJson(jsonStr: string): BaseBrowserPreset {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Conteúdo JSON inválido');
    }
    const merged: BaseBrowserPreset = {
      ...(defaultBasePresetData as unknown as BaseBrowserPreset),
      ...parsed,
    };
    this.saveActivePreset(merged);
    return merged;
  },

  /**
   * Gera o objeto inicial completo do formulário de criação de perfil,
   * eliminando fallbacks órfãos e combinando o preset base com a máquina física sorteada.
   */
  createProfileFormData(
    overrideOS?: SupportedOS,
    overrideKernel?: SupportedKernel,
  ) {
    const activePreset = this.getActivePreset();
    const effectiveOS = overrideOS || activePreset.defaultOS || 'windows';
    const effectiveKernel =
      effectiveOS === 'android'
        ? 'AstroBrowser'
        : overrideKernel || activePreset.defaultKernel || 'AstroBrowser';

    const physicalPreset = getRandomPreset(effectiveOS, effectiveKernel);

    return {
      name: '',
      group: activePreset.group || 'Desagrupado',
      tags: [...(activePreset.tags || [])],
      kernel: effectiveKernel,
      kernelVersion: physicalPreset.kernelVersion || activePreset.kernelVersion || '150',
      os: physicalPreset.os,
      osVersion: physicalPreset.osVersion,
      platform: physicalPreset.platform,
      userAgent: physicalPreset.userAgent,
      userAgentCategory: 'Todo',
      cookies: '',
      notes: '',

      proxyMode: activePreset.proxyMode || 'custom',
      proxyType: activePreset.proxyType || 'none',
      proxyHost: activePreset.proxyHost || '',
      proxyPort: activePreset.proxyPort || '',
      proxyUser: activePreset.proxyUser || '',
      proxyPass: activePreset.proxyPass || '',
      proxyRotationUrl: activePreset.proxyRotationUrl || '',
      ipChecker: activePreset.ipChecker || 'IP2Location',
      socksRemoteDns: activePreset.socksRemoteDns ?? true,

      platformUrl: activePreset.platformUrl || '',
      platformAccounts: [...(activePreset.platformAccounts || [])],
      duplicateCheckRules: { ...(activePreset.duplicateCheckRules || { usernamePassword: true, cookie: true, cUser: true }) },
      openTabsUrls: activePreset.openTabsUrls || '',

      cpuMode: activePreset.cpuMode || 'custom',
      cpuCores: activePreset.cpuMode === 'custom' ? (activePreset.cpuCores || 8) : physicalPreset.cpuCores,
      webrtcMode: activePreset.webrtcMode || 'disabled',
      timezoneMode: activePreset.timezoneMode || 'ip',
      customTimezone: activePreset.timezoneMode === 'custom' ? (activePreset.customTimezone || 'America/Sao_Paulo') : '',
      locationMode: activePreset.locationMode || 'ip',
      locationPermission: activePreset.locationPermission || 'ask',
      customLatitude: activePreset.customLatitude || '',
      customLongitude: activePreset.customLongitude || '',
      customAccuracy: activePreset.customAccuracy || 1000,
      displayLanguageMode: activePreset.displayLanguageMode || 'language',
      screenResolutionMode: activePreset.screenResolutionMode || 'default',
      screenResolution: activePreset.screenResolution || 'Com base no User-Agent',
      customScreenWidth: activePreset.screenResolutionMode === 'custom' ? (activePreset.customScreenWidth || 1920) : physicalPreset.customScreenWidth,
      customScreenHeight: activePreset.screenResolutionMode === 'custom' ? (activePreset.customScreenHeight || 1080) : physicalPreset.customScreenHeight,
      devicePixelRatio: activePreset.screenResolutionMode === 'custom' ? (activePreset.devicePixelRatio || 1) : physicalPreset.devicePixelRatio,
      fontsMode: activePreset.fontsMode || 'default',
      colorDepth: physicalPreset.colorDepth || 24,
      languageMode: activePreset.languageMode || 'ip',
      customLanguage: activePreset.languageMode === 'custom' ? (activePreset.customLanguage || 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7') : '',
      audioSampleRate: activePreset.audioSampleRate || 48000,
      hardwareNoise: {
        canvas: activePreset.hardwareNoise?.canvas ?? false,
        webglImage: activePreset.hardwareNoise?.webglImage ?? false,
        audioContext: activePreset.hardwareNoise?.audioContext ?? false,
        mediaDevices: activePreset.hardwareNoise?.mediaDevices ?? false,
        clientRects: activePreset.hardwareNoise?.clientRects ?? false,
        speechVoices: activePreset.hardwareNoise?.speechVoices ?? false,
        fontPack: activePreset.hardwareNoise?.fontPack ?? false,
        fontMetrics: activePreset.hardwareNoise?.fontMetrics ?? false,
      },
      clientRectsSeed: physicalPreset.clientRectsSeed,
      canvasSeed: physicalPreset.canvasSeed,
      webglSeed: physicalPreset.webglSeed,
      audioSeed: physicalPreset.audioSeed,
      webglMetadataMode: activePreset.webglMetadataMode || 'custom',
      webglVendor: physicalPreset.webglVendor,
      webglRenderer: physicalPreset.webglRenderer,
      webgpuMode: activePreset.webgpuMode || 'webgl',
      ramMode: activePreset.ramMode || 'custom',
      ramGb: activePreset.ramMode === 'custom' ? (activePreset.ramGb || 8) : (physicalPreset.deviceMemory || 8),
      deviceNameMode: activePreset.deviceNameMode || 'custom',
      deviceName: generateDeviceName(effectiveOS),
      macAddressMode: activePreset.macAddressMode || 'custom',
      macAddress: generateMacAddress(effectiveOS),
      doNotTrackMode: activePreset.doNotTrackMode || 'default',
      doNotTrack: activePreset.doNotTrack || 'unspecified',
      portScanProtection: activePreset.portScanProtection || 'open',
      portScanAllowedPorts: activePreset.portScanAllowedPorts || '',
      hardwareAcceleration: activePreset.hardwareAcceleration || 'default',
      disableTlsFeatures: activePreset.disableTlsFeatures || 'close',

      maxTouchPoints: physicalPreset.maxTouchPoints || 0,
      batteryMode: activePreset.batteryMode || 'desktop',
      mediaDevicesCount: {
        micros: physicalPreset.media.mics.length,
        webcams: physicalPreset.media.camera ? 1 : 0,
        speakers: physicalPreset.media.outs.length,
      },
      mediaDevicesDetails: physicalPreset.media,
      globalPrivacyControl: activePreset.globalPrivacyControl ?? false,
      memorySaver: activePreset.memorySaver ?? false,
      dnsBlocklist: activePreset.dnsBlocklist || 'normal',
      ephemeral: activePreset.ephemeral ?? false,
      enablePassword: activePreset.enablePassword ?? false,
      password: activePreset.password || '',
      launchHook: activePreset.launchHook || '',
      extensionMode: activePreset.extensionMode || 'team',
      extensionCategory: activePreset.extensionCategory || 'kit_basico',
      extensions: [...(activePreset.extensions || [])],
    };
  },
};

export default serviceBasePresets;
