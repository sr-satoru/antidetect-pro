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
  platform: string;
  arch: string;
}

// Versão atual dinâmica puxada diretamente do package.json da aplicação
export const CURRENT_APP_VERSION: string = packageInfo.version || '0.1.1';

export const appUpdateService = {
  /**
   * Consulta o backend Rust (/api/app/check-update) que gerencia nativamente
   * a busca de releases, tags no GitHub e matching de sistema operacional.
   */
  async checkForAppUpdate(): Promise<AppReleaseInfo | null> {
    try {
      const data = await http.get<AppReleaseInfo>(
        `/api/app/check-update?current_version=${encodeURIComponent(CURRENT_APP_VERSION)}`
      );
      return data;
    } catch (err) {
      console.warn('[UpdateService] Não foi possível verificar atualização com o backend Star Multlogin:', err);
      return null;
    }
  },

  /**
   * Solicita ao backend Rust abrir a URL de download ou release diretamente
   * no navegador nativo do sistema operacional (xdg-open no Linux, start no Windows, open no Mac).
   */
  async openDownload(url?: string): Promise<boolean> {
    try {
      await http.post<{ success: boolean; message: string }>('/api/app/open-download', { url });
      return true;
    } catch (err) {
      console.warn('[UpdateService] Falha ao abrir via backend, usando fallback webview:', err);
      if (typeof window !== 'undefined' && url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return false;
    }
  },
};


