/**
 * Test Suite: Paridade Bidirecional de Contratos Frontend <-> Backend
 * 
 * Verifica se:
 * 1. O frontend NÃO está enviando campos além do devido para o backend (CreateProfileDto / UpdateProfileDto)
 * 2. Quando em modo IP, os campos custom_* são omitidos para proteger o GeoIP nativo do backend
 * 3. Todos os 4 modelos de SO (Windows, macOS, Linux, Android) produzem payloads estritos e válidos
 * 4. Vice-Versa: O frontend (service.mapper.ts -> profileToFormData) reconstrói perfeitamente o formData
 *    a partir da resposta do backend (Profile) sem perda de dados ou fallbacks indevidos
 * 5. Roundtrip idempotente: formData -> montarPayload -> profileToFormData -> montarPayload (Zero Drift)
 * 6. Integração ao vivo: comunicação real com o backend Axum (POST /api/profiles, GET, DELETE)
 */

import { impressaoDigitalService } from '../services/criar-perfil/service.impressoes';
import { serviceBasePresets } from '../services/presets/service.base-presets';
import { profileToFormData } from '../services/perfis/service.mapper';
import type { CreateProfileDto } from '../types';

// ============================================================================
// 1. ESQUEMA ESTRITO DO BACKEND RUST (CreateProfileDto)
// ============================================================================
const ALLOWED_BACKEND_CREATE_FIELDS = new Set<string>([
  'id',
  'name',
  'group',
  'tags',
  'tag_ids',
  'notes',
  'status',
  'kernel',
  'browser_version',
  'os',
  'proxy_type',
  'proxy_host',
  'proxy_port',
  'proxy_username',
  'proxy_password',
  'fingerprint_json',
  'extension_mode',
  'extension_category',
  'extensions',
]);

const ALLOWED_FINGERPRINT_FIELDS = new Set<string>([
  'proxy_mode',
  'proxy_type',
  'proxy_host',
  'proxy_port',
  'proxy_username',
  'proxy_password',
  'proxy_rotation_url',
  'ip_checker',
  'socks_remote_dns',
  'extension_mode',
  'extension_category',
  'extensoes_ids',
  'extensions',
  'platform_url',
  'platform_accounts',
  'open_tabs_urls',
  'cookies',
  'kernel',
  'kernel_version',
  'os',
  'os_version',
  'user_agent',
  'user_agent_category',
  'webrtc_mode',
  'timezone_mode',
  'custom_timezone',
  'location_mode',
  'location_permission',
  'custom_latitude',
  'custom_longitude',
  'custom_accuracy',
  'language_mode',
  'custom_language',
  'screen_resolution_mode',
  'screen_resolution',
  'custom_screen_width',
  'custom_screen_height',
  'color_depth',
  'device_pixel_ratio',
  'max_touch_points',
  'fonts_mode',
  'hardware_noise',
  'canvas_seed',
  'webgl_seed',
  'audio_seed',
  'client_rects_seed',
  'audio_sample_rate',
  'webgl_metadata_mode',
  'webgl_vendor',
  'webgl_renderer',
  'webgpu_mode',
  'cpu_mode',
  'cpu_cores',
  'ram_mode',
  'ram_gb',
  'battery_mode',
  'device_name_mode',
  'device_name',
  'mac_address_mode',
  'mac_address',
  'micros_count',
  'webcams_count',
  'speakers_count',
  'do_not_track_mode',
  'port_scan_protection',
  'port_scan_allowed_ports',
  'hardware_acceleration',
  'disable_tls_features',
  'launch_hook',
]);

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FALHA: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passedTests++;
  console.log(`  ✅ ${msg}`);
}

async function runTestSuite() {
  console.log('\n🚀 INICIANDO AUDITORIA E TESTES DE PARIDADE DE CONTRATO (FRONTEND <-> BACKEND)\n');

  // --------------------------------------------------------------------------
  // GRUPO 1: Validação Estrita do Payload de Envio (Frontend -> Backend)
  // --------------------------------------------------------------------------
  console.log('📦 [GRUPO 1] Validação Estrita de Campos Permitidos no CreateProfileDto:');
  const initialForm = serviceBasePresets.createProfileFormData();
  const payload = impressaoDigitalService.montarPayloadPerfil(initialForm) as Record<string, any>;

  // 1.1 Não pode haver nenhum campo no topo além dos 19 campos permitidos do Rust
  const topKeys = Object.keys(payload);
  for (const key of topKeys) {
    if (payload[key] !== undefined) {
      assert(
        ALLOWED_BACKEND_CREATE_FIELDS.has(key),
        `Campo de topo '${key}' é reconhecido e permitido pelo backend Rust.`
      );
    }
  }

  // 1.2 Campos proibidos explícitos não devem existir no payload de criação
  assert(payload.created_at === undefined, "Payload NÃO contém 'created_at' no topo (atribuído exclusivamente pelo backend).");
  assert(payload.updated_at === undefined, "Payload NÃO contém 'updated_at' no topo (atribuído exclusivamente pelo backend).");
  assert(payload.hardwareNoise === undefined, "Payload NÃO vaza 'hardwareNoise' em camelCase para o topo do CreateProfileDto.");
  assert(payload.userAgent === undefined, "Payload NÃO vaza 'userAgent' para o topo do CreateProfileDto.");
  assert(payload.customScreenWidth === undefined, "Payload NÃO vaza 'customScreenWidth' para o topo do CreateProfileDto.");

  // 1.3 Verificação de tipos no topo
  assert(typeof payload.name === 'string' && payload.name.length > 0, "Nome do perfil é string válida.");
  assert(typeof payload.group === 'string', "Grupo do perfil é string.");
  assert(Array.isArray(payload.tags), "Tags é um Array de strings.");
  assert(payload.tag_ids === undefined || Array.isArray(payload.tag_ids), "tag_ids é undefined ou Array de números.");
  assert(typeof payload.status === 'string', "Status é string.");
  assert(payload.kernel === 'AstroFox' || payload.kernel === 'AstroBrowser', "Kernel é AstroFox ou AstroBrowser.");
  assert(typeof payload.browser_version === 'string', "browser_version é string.");
  assert(typeof payload.os === 'string', "os é string.");
  assert(payload.proxy_port === undefined || typeof payload.proxy_port === 'number', "proxy_port é number ou undefined.");
  assert(typeof payload.fingerprint_json === 'object' && payload.fingerprint_json !== null, "fingerprint_json é objeto estruturado.");

  // 1.4 Inspeção do fingerprint_json
  const fp = payload.fingerprint_json as Record<string, any>;
  for (const fpKey of Object.keys(fp)) {
    if (fp[fpKey] !== undefined) {
      assert(
        ALLOWED_FINGERPRINT_FIELDS.has(fpKey),
        `Propriedade de fingerprint '${fpKey}' é reconhecida pelo Camoufox/Clearcote.`
      );
    }
  }

  // --------------------------------------------------------------------------
  // GRUPO 2: Isolamento de Modos IP vs Custom (Anti-Vazamento e Preservação de GeoIP)
  // --------------------------------------------------------------------------
  console.log('\n🌐 [GRUPO 2] Proteção de GeoIP (Modo IP vs Modo Customizado):');

  // 2.1 Modo IP padrão: campos custom_* DEVEM ser undefined
  const ipForm = {
    ...initialForm,
    timezoneMode: 'ip',
    languageMode: 'ip',
    locationMode: 'ip',
    customTimezone: 'America/Sao_Paulo', // Usuário preencheu mas modo é 'ip'
    customLanguage: 'pt-BR,pt;q=0.9',
    customLatitude: '-23.5505',
    customLongitude: '-46.6333',
    customAccuracy: 500,
  };
  const ipPayload = impressaoDigitalService.montarPayloadPerfil(ipForm).fingerprint_json as any;
  assert(ipPayload.timezone_mode === 'ip', "timezone_mode é 'ip'.");
  assert(ipPayload.custom_timezone === undefined, "custom_timezone é undefined no modo IP (NÃO sobrescreve timezone do proxy).");
  assert(ipPayload.language_mode === 'ip', "language_mode é 'ip'.");
  assert(ipPayload.custom_language === undefined, "custom_language é undefined no modo IP (NÃO sobrescreve locale do proxy).");
  assert(ipPayload.location_mode === 'ip', "location_mode é 'ip'.");
  assert(ipPayload.custom_latitude === undefined, "custom_latitude é undefined no modo IP.");
  assert(ipPayload.custom_longitude === undefined, "custom_longitude é undefined no modo IP.");
  assert(ipPayload.custom_accuracy === undefined, "custom_accuracy é undefined no modo IP.");

  // 2.2 Modo Custom: campos custom_* DEVEM ser enviados fielmente
  const customForm = {
    ...initialForm,
    timezoneMode: 'custom',
    customTimezone: 'Europe/Berlin',
    languageMode: 'custom',
    customLanguage: 'de-DE,de;q=0.9',
    locationMode: 'custom',
    customLatitude: '52.5200',
    customLongitude: '13.4050',
    customAccuracy: 100,
  };
  const customPayload = impressaoDigitalService.montarPayloadPerfil(customForm).fingerprint_json as any;
  assert(customPayload.timezone_mode === 'custom', "timezone_mode é 'custom'.");
  assert(customPayload.custom_timezone === 'Europe/Berlin', "custom_timezone 'Europe/Berlin' enviado com sucesso.");
  assert(customPayload.language_mode === 'custom', "language_mode é 'custom'.");
  assert(customPayload.custom_language === 'de-DE,de;q=0.9', "custom_language 'de-DE,de;q=0.9' enviado com sucesso.");
  assert(customPayload.location_mode === 'custom', "location_mode é 'custom'.");
  assert(customPayload.custom_latitude === '52.5200', "custom_latitude enviado com sucesso.");
  assert(customPayload.custom_longitude === '13.4050', "custom_longitude enviado com sucesso.");
  assert(customPayload.custom_accuracy === 100, "custom_accuracy enviado como número (100).");

  // --------------------------------------------------------------------------
  // GRUPO 3: Matriz Multi-SO (Windows, macOS, Linux, Android)
  // --------------------------------------------------------------------------
  console.log('\n💻 [GRUPO 3] Paridade de Modelos Multi-SO:');

  const osList = ['windows', 'macos', 'linux', 'android'] as const;
  for (const os of osList) {
    const formOs = serviceBasePresets.createProfileFormData(os);
    const osPayload = impressaoDigitalService.montarPayloadPerfil(formOs);
    const osFp = osPayload.fingerprint_json as any;

    assert(osPayload.os === os, `Payload os corresponde a '${os}'.`);
    if (os === 'android') {
      assert(osPayload.kernel === 'AstroBrowser', "Android utiliza exclusivamente AstroBrowser (Chromium).");
      assert(osFp.max_touch_points === 5, "Android define max_touch_points = 5.");
      assert(osFp.os_version.includes('Android'), "Android possui os_version coerente com Android.");
    } else {
      assert(osFp.max_touch_points === 0, `${os} Desktop define max_touch_points = 0.`);
      assert(!osFp.os_version.includes('Android'), `${os} não possui indícios de Android na versão.`);
    }
  }

  // --------------------------------------------------------------------------
  // GRUPO 4: Vice-Versa (Backend Profile -> Frontend profileToFormData)
  // --------------------------------------------------------------------------
  console.log('\n🔄 [GRUPO 4] Mapeamento Vice-Versa (Backend Profile -> Frontend FormData):');

  const mockBackendProfile = {
    id: 'prf_test_parity_123',
    name: 'Perfil de Teste Fidelidade',
    group: 'Equipe Marketing',
    tags: [
      { id: 10, name: 'Google Ads', color: '#1677FF' },
      { id: 20, name: 'Alta Prioridade', color: '#52C41A' },
    ],
    notes: 'Nota importante de teste',
    status: 'ready',
    kernel: 'AstroFox',
    browser_version: '150',
    os: 'windows',
    created_at: 1770000000,
    updated_at: 1770000050,
    proxy: {
      mode: 'custom',
      type: 'socks5',
      host: 'proxy.star.internal',
      port: 10808,
      username: 'star_user',
      password: 'star_password',
      rotation_url: 'http://rotate.internal',
      ip_checker: 'IP2Location',
      socks_remote_dns: true,
    },
    fingerprint_json: {
      canvas_seed: 'A1B2C3D4',
      audio_seed: 'E5F6A7B8',
      client_rects_seed: '11223344',
      cpu_cores: 16,
      ram_gb: 32,
      custom_screen_width: 2560,
      custom_screen_height: 1440,
      color_depth: 30,
      device_pixel_ratio: 1.25,
      max_touch_points: 0,
      timezone_mode: 'custom',
      custom_timezone: 'America/New_York',
      language_mode: 'custom',
      custom_language: 'en-US,en;q=0.9',
      location_mode: 'custom',
      custom_latitude: '40.7128',
      custom_longitude: '-74.0060',
      custom_accuracy: 50,
      hardware_noise: {
        canvas: true,
        webgl_image: true,
        audio_context: true,
        media_devices: true,
        client_rects: true,
        speech_voices: false,
        font_pack: true,
        font_metrics: false,
      },
      device_name: 'DESKTOP-PARITY-TEST',
      mac_address: '00:1A:2B:3C:4D:5E',
      micros_count: 2,
      webcams_count: 1,
      speakers_count: 4,
    },
    extension_mode: 'team',
    extension_category: 'kit_ads',
    extensions: [{ id: 'ext1', name: 'Metamask' }],
  };

  const parsedFormData = profileToFormData(mockBackendProfile);

  assert(parsedFormData.id === 'prf_test_parity_123', "ID mapeado com sucesso.");
  assert(parsedFormData.name === 'Perfil de Teste Fidelidade', "Nome mapeado com sucesso.");
  assert(parsedFormData.group === 'Equipe Marketing', "Grupo mapeado com sucesso.");
  assert(parsedFormData.tags.length === 2, "2 Tags mapeadas com sucesso.");
  assert(parsedFormData.notes === 'Nota importante de teste', "Notas preservadas.");
  assert(parsedFormData.kernel === 'AstroFox', "Kernel AstroFox preservado.");
  assert(parsedFormData.os === 'windows', "OS windows preservado.");

  // Teste de resolução de tela
  assert(parsedFormData.customScreenWidth === 2560, "customScreenWidth mapeado com fidelidade (2560).");
  assert(parsedFormData.customScreenHeight === 1440, "customScreenHeight mapeado com fidelidade (1440).");

  // Teste de hardwareNoise (snake_case do backend -> camelCase do form)
  assert(parsedFormData.hardwareNoise.canvas === true, "hardwareNoise.canvas é true.");
  assert(parsedFormData.hardwareNoise.webglImage === true, "hardwareNoise.webglImage convertido de webgl_image para camelCase com sucesso.");
  assert(parsedFormData.hardwareNoise.audioContext === true, "hardwareNoise.audioContext convertido de audio_context com sucesso.");
  assert(parsedFormData.hardwareNoise.mediaDevices === true, "hardwareNoise.mediaDevices convertido com sucesso.");
  assert(parsedFormData.hardwareNoise.clientRects === true, "hardwareNoise.clientRects convertido com sucesso.");
  assert(parsedFormData.hardwareNoise.speechVoices === false, "hardwareNoise.speechVoices preservado como false.");
  assert(parsedFormData.hardwareNoise.fontPack === true, "hardwareNoise.fontPack preservado como true.");
  assert(parsedFormData.hardwareNoise.fontMetrics === false, "hardwareNoise.fontMetrics preservado como false.");

  // Teste de sementes (não devem ser regeneradas aleatoriamente)
  assert(parsedFormData.canvasSeed === 'A1B2C3D4', "canvasSeed preservada sem alteração.");
  assert(parsedFormData.audioSeed === 'E5F6A7B8', "audioSeed preservada sem alteração.");
  assert(parsedFormData.clientRectsSeed === '11223344', "clientRectsSeed preservada sem alteração.");

  // Teste de proxy
  assert(parsedFormData.proxyType === 'socks5', "proxyType socks5 mapeado.");
  assert(parsedFormData.proxyHost === 'proxy.star.internal', "proxyHost mapeado.");
  assert(parsedFormData.proxyPort === '10808', "proxyPort mapeado como string no formulário.");
  assert(parsedFormData.proxyUser === 'star_user', "proxyUser mapeado.");
  assert(parsedFormData.proxyPass === 'star_password', "proxyPass mapeado.");

  // Teste de dispositivos de mídia
  assert(parsedFormData.mediaDevicesCount.micros === 2, "microsCount = 2 mapeado.");
  assert(parsedFormData.mediaDevicesCount.webcams === 1, "webcamsCount = 1 mapeado.");
  assert(parsedFormData.mediaDevicesCount.speakers === 4, "speakersCount = 4 mapeado.");

  // --------------------------------------------------------------------------
  // GRUPO 5: Roundtrip Idempotente (Zero Drift)
  // --------------------------------------------------------------------------
  console.log('\n🔁 [GRUPO 5] Verificação de Idempotência Round-Trip (Zero Drift):');

  // Remonta o payload a partir do formData que acabou de ser mapeado do backend
  const remountedPayload = impressaoDigitalService.montarPayloadPerfil(parsedFormData) as any;
  const remountedFp = remountedPayload.fingerprint_json as any;

  assert(remountedPayload.name === mockBackendProfile.name, "Nome idêntico no round-trip.");
  assert(remountedPayload.os === mockBackendProfile.os, "SO idêntico no round-trip.");
  assert(remountedPayload.kernel === mockBackendProfile.kernel, "Kernel idêntico no round-trip.");
  assert(remountedPayload.proxy_host === mockBackendProfile.proxy.host, "Proxy host idêntico no round-trip.");
  assert(remountedPayload.proxy_port === mockBackendProfile.proxy.port, "Proxy port idêntico no round-trip.");
  assert(remountedFp.canvas_seed === mockBackendProfile.fingerprint_json.canvas_seed, "canvas_seed idêntica no round-trip.");
  assert(remountedFp.custom_screen_width === mockBackendProfile.fingerprint_json.custom_screen_width, "custom_screen_width idêntico no round-trip.");
  assert(remountedFp.custom_screen_height === mockBackendProfile.fingerprint_json.custom_screen_height, "custom_screen_height idêntico no round-trip.");
  assert(remountedFp.hardware_noise.webgl_image === mockBackendProfile.fingerprint_json.hardware_noise.webgl_image, "hardware_noise.webgl_image idêntico no round-trip.");
  assert(remountedFp.custom_timezone === mockBackendProfile.fingerprint_json.custom_timezone, "custom_timezone idêntico no round-trip.");

  // --------------------------------------------------------------------------
  // GRUPO 6: Comunicação Real com o Backend Axum (HTTP Live Test)
  // --------------------------------------------------------------------------
  console.log('\n⚡ [GRUPO 6] Teste de Comunicação Real com o Backend Axum (Porta 12540):');

  try {
    // 6.1 Handshake local para autenticação
    const handshakeRes = await fetch('http://127.0.0.1:12540/api/local-auth/dev-handshake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(handshakeRes.ok, `Dev-Handshake retornou HTTP ${handshakeRes.status}.`);
    const handshakeData = (await handshakeRes.json()) as any;
    const sessionToken = handshakeData.session_token;
    assert(typeof sessionToken === 'string' && sessionToken.startsWith('ses_'), "Sessão desktop autorizada obtida com sucesso.");

    // 6.2 POST /api/profiles com o payload montado
    const testProfileName = `Audit Contract Test ${Date.now()}`;
    const liveFormData = {
      ...initialForm,
      name: testProfileName,
      os: 'windows',
      kernel: 'AstroFox',
      timezoneMode: 'ip',
      languageMode: 'ip',
      locationMode: 'ip',
      notes: 'Perfil de teste criado pelo script de paridade de contratos',
    };
    const livePayload = impressaoDigitalService.montarPayloadPerfil(liveFormData);

    const createRes = await fetch('http://127.0.0.1:12540/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify(livePayload),
    });

    assert(createRes.status === 201, `POST /api/profiles aceitou payload estrito do frontend e retornou 201 Created.`);
    const createdProfile = (await createRes.json()) as any;
    assert(typeof createdProfile.id === 'string' && createdProfile.id.length > 0, `Perfil persistido com ID: ${createdProfile.id}.`);
    assert(createdProfile.name === testProfileName, "Nome persistido coincide com o payload enviado.");
    assert(typeof createdProfile.created_at === 'number', "Backend gerou created_at automaticamente no Vault.");
    assert(typeof createdProfile.updated_at === 'number', "Backend gerou updated_at automaticamente no Vault.");

    // 6.3 GET /api/profiles/:id e validação no mapper do frontend
    const getRes = await fetch(`http://127.0.0.1:12540/api/profiles/${createdProfile.id}`, {
      headers: { 'X-Session-Token': sessionToken },
    });
    assert(getRes.ok, `GET /api/profiles/${createdProfile.id} retornou HTTP ${getRes.status}.`);
    const fetchedProfile = (await getRes.json()) as any;

    const roundtripForm = profileToFormData(fetchedProfile);
    assert(roundtripForm.name === testProfileName, "profileToFormData desserializou o perfil do backend com sucesso.");
    assert(roundtripForm.timezoneMode === 'ip', "timezoneMode continua 'ip' sem sofrer poluição.");
    assert(roundtripForm.customTimezone === '', "customTimezone permanece vazio no frontend quando modo é IP.");

    // 6.4 Limpeza (Soft delete + Permanent delete)
    const delRes = await fetch(`http://127.0.0.1:12540/api/profiles/${createdProfile.id}/permanent`, {
      method: 'DELETE',
      headers: { 'X-Session-Token': sessionToken },
    });
    assert(delRes.ok, `DELETE permanente do perfil de teste executado com status ${delRes.status}.`);

  } catch (err: any) {
    console.error('⚠️ Falha no teste ao vivo com o backend:', err?.message || err);
    throw err;
  }

  console.log(`\n🎉 TODOS OS TESTES PASSARAM! (${passedTests}/${totalTests} asserções validadas com sucesso)\n`);
}

runTestSuite().catch((err) => {
  console.error('\n❌ EXECUÇÃO INTERROMPIDA COM ERRO:', err);
  process.exit(1);
});
