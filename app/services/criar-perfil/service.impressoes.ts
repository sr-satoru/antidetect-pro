/**
 * Service dedicado para gestão e formatação das Impressões Digitais (Fingerprint).
 * Extrai e envia ao backend apenas as configurações técnicas estritamente necessárias.
 */

import { http } from '../http';
import config from '@/config/perfil.json';

export interface ImpressaoDigitalData {
  // Proxy associado
  proxy_mode?: 'custom' | 'saved' | 'none';
  proxy_type?: string;
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_password?: string;
  proxy_rotation_url?: string;
  ip_checker?: string;
  socks_remote_dns?: boolean;

  // Extensões e contas
  extension_mode?: string;
  extension_category?: string;
  extensoes_ids?: any[];
  extensions?: any[];
  platform_url?: string;
  platform_accounts?: any[];
  open_tabs_urls?: string;
  cookies?: string;

  // Sistema e Kernel
  kernel?: string;
  kernel_version?: string;
  os?: string;
  os_version?: string;
  user_agent?: string;
  user_agent_category?: string;

  // WebRTC e Fuso Horário
  webrtc_mode?: string;
  timezone_mode?: string;
  custom_timezone?: string;

  // Geolocalização
  location_mode?: string;
  location_permission?: string;
  custom_latitude?: string;
  custom_longitude?: string;
  custom_accuracy?: number;

  // Língua
  language_mode?: string;
  custom_language?: string;

  // Resolução de Ecrã
  screen_resolution_mode?: string;
  screen_resolution?: string;
  custom_screen_width?: number;
  custom_screen_height?: number;
  color_depth?: number;
  device_pixel_ratio?: number;
  max_touch_points?: number;

  // Fontes
  fonts_mode?: string;

  // Ruído de Hardware (Anti-Fingerprint)
  hardware_noise?: {
    canvas?: boolean;
    webgl_image?: boolean;
    audio_context?: boolean;
    media_devices?: boolean;
    client_rects?: boolean;
    speech_voices?: boolean;
    font_pack?: boolean;
    font_metrics?: boolean;
  };

  // Seeds
  canvas_seed?: string;
  webgl_seed?: string;
  audio_seed?: string;
  client_rects_seed?: string;
  audio_sample_rate?: number;

  // GPU & WebGL
  webgl_metadata_mode?: string;
  webgl_vendor?: string;
  webgl_renderer?: string;
  webgpu_mode?: string;

  // CPU e Memória
  cpu_mode?: string;
  cpu_cores?: number;
  ram_mode?: string;
  ram_gb?: number;

  // Identificação da Máquina
  battery_mode?: string;
  device_name_mode?: string;
  device_name?: string;
  mac_address_mode?: string;
  mac_address?: string;

  // Dispositivos de Mídia
  micros_count?: number;
  webcams_count?: number;
  speakers_count?: number;

  // Segurança e Rede
  do_not_track_mode?: string;
  port_scan_protection?: string;
  port_scan_allowed_ports?: string;
  hardware_acceleration?: string;
  disable_tls_features?: string;
  launch_hook?: string;
}

/**
 * Converte o formulário bruto da tela de Criar Perfil em uma
 * estrutura limpa e sem dados duplicados para o backend.
 */
export function extrairImpressaoDigitalLimpa(formData: any): ImpressaoDigitalData {
  return {
    proxy_mode: formData.proxyMode || 'custom',
    proxy_type: formData.proxyType || 'none',
    proxy_host: formData.proxyHost || undefined,
    proxy_port: formData.proxyPort ? Number(formData.proxyPort) : undefined,
    proxy_username: formData.proxyUser || undefined,
    proxy_password: formData.proxyPass || undefined,
    proxy_rotation_url: formData.proxyRotationUrl || undefined,
    ip_checker: formData.ipChecker || 'IP2Location',
    extension_mode: formData.extensionMode || 'team',
    extension_category: formData.extensionCategory || 'kit_basico',
    extensoes_ids: Array.isArray(formData.extensions)
      ? formData.extensions.map((e: any) => e.id ?? e)
      : [],
    extensions: Array.isArray(formData.extensions) ? formData.extensions : [],
    platform_url: formData.platformUrl || undefined,
    platform_accounts: (Array.isArray(formData.platformAccounts) ? formData.platformAccounts : []).map((acc: any) => {
      let customDomain = acc.customDomain || '';
      if (!customDomain && acc.platform && acc.platform !== 'other') {
        const preset = config.platforms.find((p: any) => p.id === acc.platform);
        if (preset?.domain) {
          customDomain = preset.domain;
        }
      }
      return {
        ...acc,
        customDomain,
      };
    }),
    open_tabs_urls: formData.openTabsUrls || undefined,
    cookies: formData.cookies || undefined,

    kernel: (formData.os || '').toLowerCase() === 'android' ? 'AstroBrowser' : (formData.kernel || 'AstroFox'),
    kernel_version: formData.kernelVersion || '150',
    os: (formData.os || 'windows').toLowerCase(),
    os_version: formData.osVersion || 'Linux x86_64',
    user_agent: formData.userAgent || undefined,
    user_agent_category: formData.userAgentCategory || 'Todo',

    webrtc_mode: formData.webrtcMode || 'disabled',
    timezone_mode: formData.timezoneMode || 'ip',
    custom_timezone: formData.customTimezone || 'America/Sao_Paulo',

    location_mode: formData.locationMode || 'ip',
    location_permission: formData.locationPermission || 'ask',
    custom_latitude: formData.customLatitude || undefined,
    custom_longitude: formData.customLongitude || undefined,
    custom_accuracy: formData.customAccuracy ? Number(formData.customAccuracy) : 1000,

    language_mode: formData.languageMode || 'ip',
    custom_language: formData.customLanguage || 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

    screen_resolution_mode: formData.screenResolutionMode || 'default',
    screen_resolution: formData.screenResolution || 'Com base no User-Agent',
    custom_screen_width: formData.customScreenWidth ? Number(formData.customScreenWidth) : 1920,
    custom_screen_height: formData.customScreenHeight ? Number(formData.customScreenHeight) : 1080,
    color_depth: formData.colorDepth ? Number(formData.colorDepth) : 24,
    device_pixel_ratio: formData.devicePixelRatio ? Number(formData.devicePixelRatio) : 1.0,
    max_touch_points: formData.maxTouchPoints ? Number(formData.maxTouchPoints) : 0,

    fonts_mode: formData.fontsMode || 'default',

    hardware_noise: {
      canvas: !!formData.hardwareNoise?.canvas,
      webgl_image: !!formData.hardwareNoise?.webglImage,
      audio_context: !!formData.hardwareNoise?.audioContext,
      media_devices: !!formData.hardwareNoise?.mediaDevices,
      client_rects: !!formData.hardwareNoise?.clientRects,
      speech_voices: !!formData.hardwareNoise?.speechVoices,
      font_pack: !!formData.hardwareNoise?.fontPack,
      font_metrics: !!formData.hardwareNoise?.fontMetrics,
    },

    canvas_seed: formData.canvasSeed,
    webgl_seed: formData.webglSeed,
    audio_seed: formData.audioSeed,
    client_rects_seed: formData.clientRectsSeed,
    audio_sample_rate: formData.audioSampleRate ? Number(formData.audioSampleRate) : 48000,

    webgl_metadata_mode: formData.webglMetadataMode || 'custom',
    webgl_vendor: formData.webglVendor,
    webgl_renderer: formData.webglRenderer,
    webgpu_mode: formData.webgpuMode || 'webgl',

    cpu_mode: formData.cpuMode || 'custom',
    cpu_cores: formData.cpuCores ? Number(formData.cpuCores) : 10,
    ram_mode: formData.ramMode || 'custom',
    ram_gb: formData.ramGb ? Number(formData.ramGb) : 8,

    battery_mode: formData.batteryMode || 'desktop',
    device_name_mode: formData.deviceNameMode || 'custom',
    device_name: formData.deviceName,
    mac_address_mode: formData.macAddressMode || 'custom',
    mac_address: formData.macAddress,

    micros_count: formData.mediaDevicesCount?.micros ?? 1,
    webcams_count: formData.mediaDevicesCount?.webcams ?? 1,
    speakers_count: formData.mediaDevicesCount?.speakers ?? 2,

    do_not_track_mode: formData.doNotTrackMode || 'default',
    port_scan_protection: formData.portScanProtection || 'open',
    port_scan_allowed_ports: formData.portScanAllowedPorts || undefined,
    hardware_acceleration: formData.hardwareAcceleration || 'default',
    disable_tls_features: formData.disableTlsFeatures || 'close',
    launch_hook: formData.launchHook || undefined,
  };
}

export const impressaoDigitalService = {
  /**
   * Prepara o payload completo e limpo para envio ao endpoint POST /api/profiles.
   * Envia os campos cadastrais do perfil junto com a impressão digital estruturada.
   */
  montarPayloadPerfil: (formData: any) => {
    const impressao = extrairImpressaoDigitalLimpa(formData);

    let tagsArray: string[] = [];
    if (Array.isArray(formData.tags)) {
      tagsArray = formData.tags
        .map((t: any) => (typeof t === 'string' ? t : t?.name || ''))
        .map((t: string) => t.trim())
        .filter(Boolean);
    } else if (typeof formData.tags === 'string' && formData.tags.trim()) {
      tagsArray = formData.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    }

    let tagIds: number[] = [];
    if (Array.isArray(formData.tags)) {
      tagIds = formData.tags
        .map((t: any) => (typeof t === 'object' && t?.id ? Number(t.id) : null))
        .filter((id: number | null): id is number => typeof id === 'number' && !isNaN(id) && id > 0);
    }
    if (Array.isArray(formData.tagIds)) {
      tagIds = Array.from(new Set([...tagIds, ...formData.tagIds.map(Number).filter((n: number) => !isNaN(n))]));
    }

    const profileId = formData.id && String(formData.id).trim() ? String(formData.id).trim() : undefined;
    const nowSecs = Math.floor(Date.now() / 1000);
    const proxyPort = formData.proxyPort ? Number(formData.proxyPort) : undefined;

    return {
      // 1. Identificador Semântico (Base62 prf_) atribuído pelo backend e Marcadores Temporais (LWW)
      id: profileId,
      created_at: nowSecs,
      updated_at: nowSecs,

      // 2. Dados cadastrais do Perfil
      name: (formData.name && formData.name.trim()) || 'NOVO PERFIL',
      group: formData.group || 'Desagrupado',
      tags: tagsArray,
      tag_ids: tagIds.length > 0 ? tagIds : undefined,
      notes: formData.notes || '',
      status: 'ready',

      // 3. Atalhos diretos para a tabela de listagem
      kernel: (formData.os || '').toLowerCase() === 'android' ? 'AstroBrowser' : (formData.kernel || 'AstroFox'),
      browser_version: formData.kernelVersion || '150',
      os: (formData.os || 'windows').toLowerCase(),
      proxy_type: formData.proxyType || 'none',
      proxy_host: formData.proxyHost || undefined,
      proxy_port: proxyPort && !isNaN(proxyPort) ? proxyPort : undefined,
      proxy_username: formData.proxyUser || undefined,
      proxy_password: formData.proxyPass || undefined,

      // Configuração de extensões para o launcher instalar no Camoufox
      extension_mode: formData.extensionMode || 'team',
      extension_category: formData.extensionCategory || 'kit_basico',
      extensions: Array.isArray(formData.extensions) ? formData.extensions : [],

      // 4. Objeto de Impressão Digital nativo estruturado (sem JSON.stringify escapado)
      fingerprint_json: impressao,
    };
  },

  /**
   * Obtém a impressão digital detalhada de um perfil pelo ID
   */
  getById: (id: string | number) => {
    return http.get<ImpressaoDigitalData>(`/api/profiles/${id}`);
  },
};

export default impressaoDigitalService;
