import config from '@/config/perfil.json';
import { getUserAgents, getGpuOptions, isChromiumKernel, generateRandomHexSeed } from '@/services/navegador-presets';
import { serviceBasePresets } from '@/services/presets/service.base-presets';
import { generateDeviceName, generateMacAddress } from '@/components/criar-perfil/impressoes';

/**
 * Mapeia os dados do Perfil vindos da API do backend Rust
 * para a estrutura de estado (formData) consumida pelas abas do formulário.
 */
export function profileToFormData(profile: any): any {
  if (!profile) return null;

  const activePreset = serviceBasePresets.getActivePreset();

  // Extrai o objeto de impressão digital bruto (pode vir como string JSON ou objeto)
  let fp: any = {};
  if (typeof profile.fingerprint_json === 'string') {
    try {
      fp = JSON.parse(profile.fingerprint_json);
    } catch {
      fp = {};
    }
  } else if (typeof profile.fingerprint_json === 'object' && profile.fingerprint_json !== null) {
    fp = profile.fingerprint_json;
  }

  const osKey = (profile.os || fp.os || activePreset.defaultOS || 'windows').toLowerCase();
  const isAndroid = osKey === 'android';
  const rawKernel = profile.kernel || fp.kernel || activePreset.defaultKernel;
  const kernel = isAndroid || isChromiumKernel(rawKernel)
    ? 'AstroBrowser'
    : 'AstroFox';
  const uas = getUserAgents(osKey, kernel);
  const defaultGpu = getGpuOptions(osKey, kernel)[0] || { vendor: 'Google Inc.', renderer: 'Intel(R) HD Graphics' };
  const webgl = defaultGpu;

  // Normalização de tags (array de strings)
  const tagsList = Array.isArray(profile.tags)
    ? profile.tags
    : typeof profile.tags === 'string'
      ? profile.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

  // Dados do proxy estruturados
  const proxy = profile.proxy || {};
  const proxyType = proxy.type || proxy.proxy_type || profile.proxy_type || fp.proxy_type || 'none';
  const proxyHost = proxy.host || profile.proxy_host || fp.proxy_host || '';
  const proxyPort = proxy.port || profile.proxy_port || fp.proxy_port || '';
  const proxyUser = proxy.username || proxy.user || profile.proxy_username || fp.proxy_username || '';
  const proxyPass = proxy.password || proxy.pass || profile.proxy_password || fp.proxy_password || '';

  let defaultOsVer = 'Windows NT 10.0; Win64; x64';
  if (osKey === 'macos') defaultOsVer = 'Macintosh; Intel Mac OS X 10_15_7';
  else if (osKey === 'linux') defaultOsVer = 'Linux x86_64';
  else if (osKey === 'android') defaultOsVer = 'Linux armv8l (Android 14)';

  const defaultPlatform =
    osKey === 'windows' ? 'Win32' :
    osKey === 'macos' ? 'MacIntel' :
    osKey === 'android' ? 'Linux armv8l' : 'Linux x86_64';

  return {
    id: profile.id,
    name: profile.name || '',
    group: profile.group || activePreset.group || 'Desagrupado',
    tags: tagsList,
    kernel: kernel,
    kernelVersion: (() => {
      const v = isAndroid ? '135' : (profile.browser_version || fp.kernel_version || activePreset.kernelVersion || '135');
      return (v === '150' || parseInt(v, 10) >= 145) ? '135' : v;
    })(),
    os: osKey,
    osVersion: fp.os_version || defaultOsVer,
    platform: fp.platform || profile.platform || defaultPlatform,
    userAgent: fp.user_agent || uas[0] || '',
    userAgentCategory: fp.user_agent_category || 'Todo',
    cookies: fp.cookies || '',
    notes: profile.notes || '',
    deviceMemory: fp.device_memory ?? fp.ram_gb ?? activePreset.ramGb ?? 8,

    // Proxy
    proxyMode: proxy.mode || fp.proxy_mode || activePreset.proxyMode || 'custom',
    proxyType,
    proxyHost,
    proxyPort: String(proxyPort || ''),
    proxyUser,
    proxyPass,
    proxyRotationUrl: proxy.rotation_url || fp.proxy_rotation_url || '',
    ipChecker: proxy.ip_checker || fp.ip_checker || activePreset.ipChecker || 'IP2Location',
    socksRemoteDns: proxy.socks_remote_dns ?? fp.socks_remote_dns ?? activePreset.socksRemoteDns ?? true,

    // Plataforma
    platformUrl: fp.platform_url || '',
    platformAccounts: (Array.isArray(fp.platform_accounts) ? fp.platform_accounts : []).map((acc: any) => {
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
    duplicateCheckRules: fp.duplicate_check_rules || {
      usernamePassword: true,
      cookie: true,
      cUser: true,
    },
    openTabsUrls: fp.open_tabs_urls || '',

    // Hardware & Impressão Digital
    cpuMode: fp.cpu_mode || activePreset.cpuMode || 'custom',
    cpuCores: fp.cpu_cores ?? activePreset.cpuCores ?? 8,
    webrtcMode: fp.webrtc_mode || activePreset.webrtcMode || 'substitute',
    timezoneMode: fp.timezone_mode || activePreset.timezoneMode || 'ip',
    customTimezone: fp.custom_timezone || '',
    locationMode: fp.location_mode || activePreset.locationMode || 'ip',
    locationPermission: fp.location_permission || activePreset.locationPermission || 'ask',
    customLatitude: fp.custom_latitude || '',
    customLongitude: fp.custom_longitude || '',
    customAccuracy: fp.custom_accuracy ?? activePreset.customAccuracy ?? 1000,
    displayLanguageMode: fp.display_language_mode || activePreset.displayLanguageMode || 'language',
    screenResolutionMode: fp.screen_resolution_mode || activePreset.screenResolutionMode || 'default',
    screenResolution: fp.screen_resolution || activePreset.screenResolution || 'Com base no User-Agent',
    customScreenWidth: fp.custom_screen_width ?? fp.screen_width ?? activePreset.customScreenWidth ?? 1920,
    customScreenHeight: fp.custom_screen_height ?? fp.screen_height ?? activePreset.customScreenHeight ?? 1080,
    fontsMode: fp.fonts_mode || activePreset.fontsMode || 'default',
    colorDepth: fp.color_depth ?? activePreset.colorDepth ?? 24,
    languageMode: fp.language_mode || activePreset.languageMode || 'ip',
    customLanguage: fp.custom_language || '',
    audioSampleRate: fp.audio_sample_rate ?? activePreset.audioSampleRate ?? 48000,
    hardwareNoise: (() => {
      const rawNoise = fp.hardware_noise || {};
      const baseNoise = activePreset.hardwareNoise || {};
      return {
        canvas: rawNoise.canvas ?? baseNoise.canvas ?? false,
        webglImage: rawNoise.webglImage ?? rawNoise.webgl_image ?? baseNoise.webglImage ?? false,
        audioContext: rawNoise.audioContext ?? rawNoise.audio_context ?? baseNoise.audioContext ?? false,
        mediaDevices: rawNoise.mediaDevices ?? rawNoise.media_devices ?? baseNoise.mediaDevices ?? false,
        clientRects: rawNoise.clientRects ?? rawNoise.client_rects ?? baseNoise.clientRects ?? false,
        speechVoices: rawNoise.speechVoices ?? rawNoise.speech_voices ?? baseNoise.speechVoices ?? false,
        fontPack: rawNoise.fontPack ?? rawNoise.font_pack ?? baseNoise.fontPack ?? false,
        fontMetrics: rawNoise.fontMetrics ?? rawNoise.font_metrics ?? baseNoise.fontMetrics ?? false,
      };
    })(),
    clientRectsSeed: fp.client_rects_seed || generateRandomHexSeed(),
    canvasSeed: fp.canvas_seed || generateRandomHexSeed(),
    webglSeed: fp.webgl_seed || generateRandomHexSeed(),
    audioSeed: fp.audio_seed || generateRandomHexSeed(),
    webglMetadataMode: fp.webgl_metadata_mode || activePreset.webglMetadataMode || 'custom',
    webglVendor: fp.webgl_vendor || webgl.vendor,
    webglRenderer: fp.webgl_renderer || webgl.renderer,
    webgpuMode: fp.webgpu_mode || activePreset.webgpuMode || 'webgl',
    ramMode: fp.ram_mode || activePreset.ramMode || 'custom',
    ramGb: fp.ram_gb ?? fp.device_memory ?? activePreset.ramGb ?? 8,
    deviceNameMode: fp.device_name_mode || activePreset.deviceNameMode || 'custom',
    deviceName: fp.device_name || generateDeviceName(osKey),
    macAddressMode: fp.mac_address_mode || activePreset.macAddressMode || 'custom',
    macAddress: fp.mac_address || generateMacAddress(osKey),
    doNotTrackMode: fp.do_not_track_mode || activePreset.doNotTrackMode || 'default',
    portScanProtection: fp.port_scan_protection || activePreset.portScanProtection || 'open',
    portScanAllowedPorts: fp.port_scan_allowed_ports || '',
    hardwareAcceleration: fp.hardware_acceleration || activePreset.hardwareAcceleration || 'default',
    disableTlsFeatures: fp.disable_tls_features || activePreset.disableTlsFeatures || 'close',

    devicePixelRatio: fp.device_pixel_ratio ?? 1,
    maxTouchPoints: fp.max_touch_points ?? 0,
    batteryMode: fp.battery_mode || 'desktop',
    mediaDevicesCount: {
      micros: fp.micros_count ?? 1,
      webcams: fp.webcams_count ?? 1,
      speakers: fp.speakers_count ?? 2,
    },
    doNotTrack: fp.do_not_track || 'unspecified',
    globalPrivacyControl: fp.global_privacy_control ?? false,
    memorySaver: fp.memory_saver ?? false,
    dnsBlocklist: fp.dns_blocklist || 'normal',
    ephemeral: fp.ephemeral ?? false,
    enablePassword: fp.enable_password ?? false,
    password: fp.password || '',
    launchHook: fp.launch_hook || '',
    extensionMode: profile.extension_mode || fp.extension_mode || 'team',
    extensionCategory: profile.extension_category || fp.extension_category || 'kit_basico',
    extensions: profile.extensions || fp.extensions || [],
  };
}
