import { impressaoDigitalService } from '../app/services/criar-perfil/service.impressoes.ts';
import fs from 'fs';

// Simula os dados preenchidos no formulário pelo usuário na tela criar-perfil
const mockFormData = {
  name: "Perfil VIP MercadoLivre #01",
  group: "Contas Principais",
  tags: ["MercadoLivre", "Vendas"],
  kernel: "Camoufox",
  kernelVersion: "150",
  os: "windows",
  osVersion: "Windows 10",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
  userAgentCategory: "Todo",
  cookies: "",
  notes: "Conta principal de vendas com proxy dedicado",

  proxyMode: "custom",
  proxyType: "socks5",
  proxyHost: "192.168.1.150",
  proxyPort: 1080,
  proxyUser: "star_user",
  proxyPass: "secret_pass_123",
  proxyRotationUrl: "",
  ipChecker: "IP2Location",
  socksRemoteDns: true,

  platformUrl: "https://mercadolivre.com.br",
  platformAccounts: [],
  openTabsUrls: "https://mercadolivre.com.br,https://google.com",

  cpuMode: "custom",
  cpuCores: 8,
  webrtcMode: "disabled",
  timezoneMode: "ip",
  customTimezone: "America/Sao_Paulo",
  locationMode: "ip",
  locationPermission: "ask",
  customLatitude: "",
  customLongitude: "",
  customAccuracy: 1000,
  screenResolutionMode: "custom",
  screenResolution: "1920x1080",
  customScreenWidth: 1920,
  customScreenHeight: 1080,
  fontsMode: "default",
  colorDepth: 24,
  languageMode: "custom",
  customLanguage: "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  audioSampleRate: 48000,
  hardwareNoise: {
    canvas: true,
    webglImage: true,
    audioContext: true,
    mediaDevices: false,
    clientRects: true,
    speechVoices: false,
    fontPack: true,
    fontMetrics: true,
  },
  clientRectsSeed: "0x7F3A2B1C",
  canvasSeed: "0xA1B2C3D4",
  webglSeed: "0x5E6F7A8B",
  audioSeed: "0x12345678",
  webglMetadataMode: "custom",
  webglVendor: "Google Inc. (NVIDIA)",
  webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
  webgpuMode: "webgl",
  ramMode: "custom",
  ramGb: 16,
  deviceNameMode: "custom",
  deviceName: "DESKTOP-PRO-01",
  macAddressMode: "custom",
  macAddress: "00:1A:2B:3C:4D:5E",
  doNotTrackMode: "default",
  portScanProtection: "open",
  portScanAllowedPorts: "",
  hardwareAcceleration: "default",
  disableTlsFeatures: "close",

  devicePixelRatio: 1,
  maxTouchPoints: 0,
  batteryMode: "desktop",
  mediaDevicesCount: {
    micros: 1,
    webcams: 1,
    speakers: 2,
  },
  extensionMode: "team",
  extensionCategory: "kit_basico",
  extensions: [
    { id: 1, name: "uBlock Origin", enabled: true }
  ],
};

// Executa a função do frontend que formata o payload
const payload = impressaoDigitalService.montarPayloadPerfil(mockFormData);

const outputPath = '/home/vanir/fury/frontend/scripts/payload_frontend_interceptado.json';
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

console.log('✅ Payload gerado com sucesso pelo frontend!');
console.log('📄 Salvo em:', outputPath);
console.log('Tamanho em bytes:', JSON.stringify(payload).length);
