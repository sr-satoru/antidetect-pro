import { http } from '../http';
import packageInfo from '../../package.json';

export interface AppReleaseInfo {
  currentVersion: string;
  latestVersion: string;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  hasUpdate: boolean;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  platform: string;
  arch: string;
}

export interface AppUpdateStatus {
  isDownloading: boolean;
  stage: string;
  progress: number;
  speedMbS: number;
  etaSeconds: number;
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
  readyToRestart: boolean;
}

export const CURRENT_APP_VERSION: string = packageInfo.version || '0.1.11';

export const appUpdateService = {
  /**
   * Consulta o backend Rust (/api/app/check-update) que gerencia nativamente
   * a busca de releases no GitHub e detecção cirúrgica de SO/arquitetura.
   */
  async checkForAppUpdate(): Promise<AppReleaseInfo | null> {
    try {
      const data = await http.get<AppReleaseInfo>(
        `/api/app/check-update?current_version=${encodeURIComponent(CURRENT_APP_VERSION)}`
      );
      return data;
    } catch (err) {
      console.warn('[UpdateService] Não foi possível verificar atualização com o backend:', err);
      return null;
    }
  },

  /**
   * Inicia o download em segundo plano no backend Rust.
   * O progresso é transmitido em tempo real pelo WebSocket dedicado (/api/app/ws).
   */
  async startDownload(downloadUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await http.post<{ success: boolean; message: string }>('/api/app/start-download', {
        download_url: downloadUrl,
      });
      return res;
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Falha ao solicitar início de download no backend.',
      };
    }
  },

  /**
   * Obtém o status atual do download mantido no backend Rust.
   */
  async getStatus(): Promise<AppUpdateStatus | null> {
    try {
      return await http.get<AppUpdateStatus>('/api/app/status');
    } catch {
      return null;
    }
  },

  /**
   * Solicita ao backend Rust aplicar a atualização substituindo o executável e reiniciando a aplicação.
   */
  async applyRestart(): Promise<boolean> {
    try {
      const res = await http.post<{ success: boolean; message: string }>('/api/app/apply-restart');
      return res.success;
    } catch (err) {
      console.error('[UpdateService] Erro ao reiniciar aplicação via backend:', err);
      return false;
    }
  },
};


