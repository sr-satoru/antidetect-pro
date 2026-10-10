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
  engine?: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_mb_s: number;
  eta_seconds: number;
  error?: string | null;
}

export interface BrowserStatusResponse {
  health: EngineHealthStatus;
  health_clearcote?: EngineHealthStatus;
  health_camoufox?: EngineHealthStatus;
  download: DownloadStatus;
  platform: string;
  os_name: string;
  available_version?: string;
  clearcote_version?: string;
  camoufox_version?: string;
  has_update?: boolean;
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

export interface EngineVerificationReport {
  engine: string;
  name: string;
  status: 'installed' | 'missing' | 'broken';
  is_valid: boolean;
  is_runnable: boolean;
  version: string;
  browser_version?: string;
  raw_version_output?: string;
  executable_path?: string;
  size_bytes: number;
  size_mb: number;
  message: string;
  checked_at: string;
}

export interface AllEnginesVerificationReport {
  clearcote: EngineVerificationReport;
  camoufox: EngineVerificationReport;
}

export const browserService = {
  /**
   * Obtém o estado completo de integridade e progresso dos motores Star Multlogin
   */
  async getStatus(engine?: 'clearcote' | 'camoufox' | string): Promise<BrowserStatusResponse> {
    const query = engine ? `?engine=${engine}` : '';
    return http.get<BrowserStatusResponse>(`/api/browser/status${query}`);
  },

  /**
   * Dispara o download e instalação do motor selecionado (clearcote ou camoufox)
   */
  async triggerDownload(engine?: 'clearcote' | 'camoufox' | string): Promise<{ success: boolean; message: string }> {
    const query = engine ? `?engine=${engine}` : '';
    return http.post<{ success: boolean; message: string }>(`/api/browser/download${query}`);
  },

  /**
   * Executa auditoria e validação profunda de versão no executável do motor instalado
   */
  async verifyEngine(engine?: 'clearcote' | 'camoufox'): Promise<EngineVerificationReport | AllEnginesVerificationReport> {
    const query = engine ? `?engine=${engine}` : '';
    return http.post<any>(`/api/browser/verify${query}`);
  },

  /**
   * Obtém as configurações e links do manifesto oficial
   */
  async getManifest(): Promise<BrowserManifest> {
    return http.get<BrowserManifest>('/api/browser/manifest');
  },
};
