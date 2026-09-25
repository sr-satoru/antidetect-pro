/**
 * Definição canônica da estrutura de dados do Perfil no Fury Antidetect.
 * 
 * Inspirada na arquitetura do Donut Browser:
 * - Cada perfil possui identificador universal UUID v4 (impossível colidir na nuvem).
 * - Marcadores temporais (created_at, updated_at) para sincronização sem conflito (LWW - Last-Write-Wins).
 * - Separação limpa entre metadados cadastrais, configuração de proxy e fingerprint do Camoufox.
 */

export type OsType = 'windows' | 'macos' | 'linux';
export type KernelType = 'FlowerBrowser' | 'SunBrowser';
export type ProfileStatus = 'ready' | 'running' | 'error';
export type SyncStatus = 'local' | 'synced' | 'pending_upload' | 'pending_download';

export interface ProfileProxyConfig {
  mode: 'custom' | 'saved' | 'none';
  type: 'none' | 'http' | 'https' | 'socks5';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  rotationUrl?: string;
  ipChecker?: string;
  socksRemoteDns: boolean;
}

export interface ProfileScreenConfig {
  resolutionMode: string;
  width: number;
  height: number;
  availWidth?: number;
  availHeight?: number;
  colorDepth: number;
  devicePixelRatio: number;
  maxTouchPoints: number;
}

export interface ProfileHardwareConfig {
  cpuCores: number;
  ramGb?: number; // Relevante para SunBrowser (Chromium)
  audioSampleRate: number;
}

export interface ProfileGpuConfig {
  vendor?: string;
  renderer?: string;
  webgpuMode?: string;
}

export interface ProfileNoiseConfig {
  canvas: boolean;
  webglImage: boolean;
  audioContext: boolean;
  mediaDevices: boolean;
  clientRects: boolean;
  speechVoices: boolean;
  fontMetrics: boolean;
  canvasSeed?: string;
  audioSeed?: string;
  webglSeed?: string;
  clientRectsSeed?: string;
}

export interface ProfileLocaleConfig {
  timezoneMode: string;
  customTimezone: string;
  locationMode: string;
  locationPermission: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  languageMode: string;
  customLanguage: string;
}

export interface ProfileNetworkConfig {
  webrtcMode: 'disabled' | 'proxy' | 'real' | 'custom';
  doNotTrack: boolean;
  portScanProtection: string;
  portScanAllowedPorts?: string;
  hardwareAcceleration: string;
  disableTlsFeatures: string;
}

export interface ProfileMediaDevicesConfig {
  micros: number;
  webcams: number;
  speakers: number;
}

export interface ProfileFingerprintConfig {
  kernel: KernelType;
  kernelVersion: string;
  os: OsType;
  osVersion?: string;
  userAgent?: string;
  userAgentCategory?: string;

  screen: ProfileScreenConfig;
  hardware: ProfileHardwareConfig;
  gpu: ProfileGpuConfig;
  noise: ProfileNoiseConfig;
  locale: ProfileLocaleConfig;
  network: ProfileNetworkConfig;
  mediaDevices: ProfileMediaDevicesConfig;

  fontsMode?: string;
  deviceName?: string;
  macAddress?: string;
  launchHook?: string;
}

export interface ProfileContaPlataforma {
  id: string;
  platform: string;
  customDomain?: string;
  username: string;
  password?: string;
  twoFactorKey?: string;
}

export interface ProfileSyncMetadata {
  status: SyncStatus;
  lastSync?: number;
  serverVersion?: number;
}

/**
 * Estrutura canônica completa de um Perfil (salva localmente e sincronizada com a nuvem)
 */
export interface ProfileData {
  // Identificador Universal Único gerado localmente (UUID v4)
  id: string;

  // Informações Cadastrais
  name: string;
  group: string;
  tags: string[];
  notes: string;
  status: ProfileStatus;

  // Rastreamento Temporal (Last-Write-Wins)
  createdAt: number; // Unix seconds
  updatedAt: number; // Unix seconds
  lastLaunch?: number; // Unix seconds

  // Rede & Proxy
  proxy: ProfileProxyConfig;

  // Impressão Digital Completa (Camoufox / Wayfern)
  fingerprint: ProfileFingerprintConfig;

  // Plataformas, Cookies e Abas Iniciais
  platformUrl?: string;
  platformAccounts?: ProfileContaPlataforma[];
  openTabsUrls?: string;
  cookies?: string;

  // Metadados de Sincronização
  sync: ProfileSyncMetadata;
}
