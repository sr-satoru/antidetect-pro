/**
 * Definições de Tipos Canônicos do Fury Antidetect.
 * Sincronizados 1:1 com os modelos do Backend Rust (`backend/src/models/`).
 */

export type OsType = 'windows' | 'macos' | 'linux';
export type KernelType = 'Camoufox' | 'FlowerBrowser' | 'SunBrowser';
export type ProfileStatus = 'ready' | 'running' | 'error';
export type ProxyType = 'none' | 'http' | 'https' | 'socks5' | 'mobile';

// ==========================================
// 1. MODELOS DE PROXY
// ==========================================

export interface ProfileProxyConfig {
  mode: 'custom' | 'saved' | 'none';
  proxy_type: ProxyType | string;
  host?: string;
  port?: number | string;
  username?: string;
  password?: string;
  rotation_url?: string;
  ip_checker?: string;
  socks_remote_dns?: boolean;
}

export interface ProxyItem {
  id: string;
  name: string;
  type?: string;
  proxy_type?: string;
  host: string;
  port: string;
  user?: string;
  username?: string;
  pass?: string;
  password?: string;
  ip?: string;
  country?: string;
  status?: string;
  created_at?: number;
}

export interface CreateProxyDto {
  name?: string;
  type?: string;
  proxy_type?: string;
  host: string;
  port: string | number;
  user?: string;
  username?: string;
  pass?: string;
  password?: string;
}

export interface TestProxyDto {
  type?: string;
  proxy_type?: string;
  host: string;
  port: string | number;
  user?: string;
  username?: string;
  pass?: string;
  password?: string;
}

export interface ProxyTestResult {
  status: 'online' | 'offline' | string;
  latency_ms: number | null;
  exit_ip: string | null;
  message: string;
}

// ==========================================
// 2. MODELOS DE PERFIL
// ==========================================

export interface Profile {
  id: string; // UUID v4
  name: string;
  group: string;
  tags: string[];
  notes: string;
  status: ProfileStatus | string;
  kernel: KernelType | string;
  browser_version: string;
  os: OsType | string;

  created_at: number; // Unix seconds
  updated_at: number; // Unix seconds
  last_launch?: number | null;

  is_deleted?: boolean;
  deleted_at?: number | null;

  proxy: ProfileProxyConfig;
  fingerprint_json: any;

  extension_mode?: string;
  extension_category?: string;
  extensions?: any;
}

export interface CreateProfileDto {
  id?: string;
  name?: string;
  group?: string;
  tags?: string | string[];
  notes?: string;
  status?: string;
  kernel?: string;
  browser_version?: string;
  os?: string;

  proxy_type?: string;
  proxy_host?: string;
  proxy_port?: string | number;
  proxy_username?: string;
  proxy_password?: string;

  fingerprint_json?: any;

  extension_mode?: string;
  extension_category?: string;
  extensions?: any;
}

export interface UpdateProfileDto {
  name?: string;
  group?: string;
  tags?: string | string[];
  notes?: string;
  status?: string;
  kernel?: string;
  browser_version?: string;
  os?: string;

  proxy_type?: string;
  proxy_host?: string;
  proxy_port?: string | number;
  proxy_username?: string;
  proxy_password?: string;

  fingerprint_json?: any;

  extension_mode?: string;
  extension_category?: string;
  extensions?: any;
}

// ==========================================
// 3. MODELOS DE TAGS
// ==========================================

export interface TagItem {
  id: string;
  name: string;
  color: string;
  created_at?: number;
  updated_at?: number;
  profile_count?: number;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

export interface BatchDeleteTagsDto {
  ids: string[];
}
