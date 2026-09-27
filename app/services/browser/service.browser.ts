import { http } from '../http';

export interface EngineHealthInstalled {
  status: 'installed';
  executable_path: string;
  version: string;
  size_bytes: number;
}

export interface EngineHealthMissing {
  status: 'missing';
  reason: string;
}

export interface EngineHealthBroken {
  status: 'broken';
  reason: string;
}

export type EngineHealthStatus =
  | EngineHealthInstalled
  | EngineHealthMissing
  | EngineHealthBroken;

export interface DownloadStatus {
  is_downloading: boolean;
  stage: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_mb_s: number;
  eta_seconds: number;
  error?: string | null;
}

export interface BrowserStatusResponse {
  health: EngineHealthStatus;
  download: DownloadStatus;
  platform: string;
  os_name: string;
}

export interface PlatformConfig {
  filename: string;
  url: string;
  exe_name: string;
  source_candidates: string[];
  size_mb: number;
}

export interface BrowserManifest {
  engine_name: string;
  version: string;
  platforms: Record<string, PlatformConfig>;
}

export const browserService = {
  /**
   * Obtém o estado completo de integridade e progresso do motor Fury
   */
  async getStatus(): Promise<BrowserStatusResponse> {
    return http.get<BrowserStatusResponse>('/api/browser/status');
  },

  /**
   * Dispara o download e instalação do motor Camoufox
   */
  async triggerDownload(): Promise<{ success: boolean; message: string }> {
    return http.post<{ success: boolean; message: string }>('/api/browser/download');
  },

  /**
   * Obtém as configurações e links do manifesto oficial
   */
  async getManifest(): Promise<BrowserManifest> {
    return http.get<BrowserManifest>('/api/browser/manifest');
  },
};
