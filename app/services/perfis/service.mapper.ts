import config from '@/config/perfil.json';
import { getUserAgents, getGpuOptions, isChromiumKernel } from '@/services/navegador-presets';

/**
 * Mapeia os dados do Perfil vindos da API do backend Rust
 * para a estrutura de estado (formData) consumida pelas abas do formulário.
 */
export function profileToFormData(profile: any): any {
  if (!profile) return null;

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

  const osKey = (profile.os || fp.os || 'linux').toLowerCase();
  const isAndroid = osKey === 'android';
  const rawKernel = profile.kernel || fp.kernel;
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
  const proxyType = proxy.proxy_type || profile.proxy_type || fp.proxy_type || 'none';
  const proxyHost = proxy.host || profile.proxy_host || fp.proxy_host || '';
  const proxyPort = proxy.port || profile.proxy_port || fp.proxy_port || '';
  const proxyUser = proxy.username || profile.proxy_username || fp.proxy_username || '';
  const proxyPass = proxy.password || profile.proxy_password || fp.proxy_password || '';

  return {
    id: profile.id,
    name: profile.name || '',
    group: profile.group || 'Desagrupado',
    tags: tagsList,
    kernel,
    kernelVersion: isAndroid ? '150' : (profile.browser_version || fp.kernel_version || '150'),
    os: osKey,
    osVersion: fp.os_version || 'Linux x86_64',
    userAgent: fp.user_agent || uas[0] || '',
    userAgentCategory: fp.user_agent_category || 'Todo',
    cookies: fp.cookies || '',
    notes: profile.notes || '',

    // Proxy
    proxyMode: proxy.mode || fp.proxy_mode || 'custom',
    proxyType,
    proxyHost,
    proxyPort: String(proxyPort || ''),
    proxyUser,
    proxyPass,
    proxyRotationUrl: proxy.rotation_url || fp.proxy_rotation_url || '',
    ipChecker: proxy.ip_checker || fp.ip_checker || 'IP2Location',
    socksRemoteDns: proxy.socks_remote_dns ?? fp.socks_remote_dns ?? true,

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
    cpuMode: fp.cpu_mode || 'custom',
    cpuCores: fp.cpu_cores ?? 10,
    webrtcMode: fp.webrtc_mode || 'disabled',
    timezoneMode: fp.timezone_mode || 'ip',
    customTimezone: fp.custom_timezone || 'America/Sao_Paulo',
    locationMode: fp.location_mode || 'ip',
    locationPermission: fp.location_permission || 'ask',
    customLatitude: fp.custom_latitude || '',
    customLongitude: fp.custom_longitude || '',
    customAccuracy: fp.custom_accuracy ?? 1000,
    displayLanguageMode: fp.display_language_mode || 'language',
    screenResolutionMode: fp.screen_resolution_mode || 'default',
    screenResolution: fp.screen_resolution || 'Com base no User-Agent',
    customScreenWidth: fp.screen_width ?? 1920,
    customScreenHeight: fp.screen_height ?? 1080,
    fontsMode: fp.fonts_mode || 'default',
    colorDepth: fp.color_depth ?? 24,
    languageMode: fp.language_mode || 'ip',
    customLanguage: fp.custom_language || 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    audioSampleRate: fp.audio_sample_rate ?? 48000,
    hardwareNoise: fp.hardware_noise || {
      canvas: false,
      webglImage: false,
      audioContext: false,
      mediaDevices: false,
      clientRects: false,
      speechVoices: false,
      fontPack: false,
      fontMetrics: false,
    },
    clientRectsSeed: fp.client_rects_seed || '12345',
    canvasSeed: fp.canvas_seed || '12345',
    webglSeed: fp.webgl_seed || '12345',
    audioSeed: fp.audio_seed || '12345',
    webglMetadataMode: fp.webgl_metadata_mode || 'custom',
    webglVendor: fp.webgl_vendor || webgl.vendor,
    webglRenderer: fp.webgl_renderer || webgl.renderer,
    webgpuMode: fp.webgpu_mode || 'webgl',
    ramMode: fp.ram_mode || 'custom',
    ramGb: fp.ram_gb ?? 8,
    deviceNameMode: fp.device_name_mode || 'custom',
    deviceName: fp.device_name || 'PC-Laptop',
    macAddressMode: fp.mac_address_mode || 'custom',
    macAddress: fp.mac_address || '00:1B:44:11:3A:B7',
    doNotTrackMode: fp.do_not_track_mode || 'default',
    portScanProtection: fp.port_scan_protection || 'open',
    portScanAllowedPorts: fp.port_scan_allowed_ports || '',
    hardwareAcceleration: fp.hardware_acceleration || 'default',
    disableTlsFeatures: fp.disable_tls_features || 'close',

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
