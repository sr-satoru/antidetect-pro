import packageInfo from '../../package.json';
import { http } from '../http';

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

export const CURRENT_APP_VERSION: string = packageInfo.version || '0.1.14';

/**
 * Invoca comandos Tauri nativos implementados em Rust em `src-tauri`
 * sem depender de nenhum pacote npm extra de Node.js.
 */
const tauriInvoke = async <T>(cmd: string, args?: Record<string, any>): Promise<T | null> => {
  if (typeof window !== 'undefined' && (window as any).__TAURI__?.core?.invoke) {
    return await (window as any).__TAURI__.core.invoke(cmd, args);
  }
  return null;
};

/**
 * Registra listeners de eventos emitidos diretamente pelo backend Rust do Tauri
 */
const tauriListen = async <T>(event: string, handler: (payload: T) => void): Promise<(() => void) | null> => {
  if (typeof window !== 'undefined' && (window as any).__TAURI__?.event?.listen) {
    return await (window as any).__TAURI__.event.listen(event, (ev: any) => handler(ev.payload));
  }
  return null;
};

export const appUpdateService = {
  /**
   * Verifica se há atualizações do aplicativo Star Multlogin consultando o daemon
   * local Rust (/api/app/check-update), com fallback nativo.
   */
  async checkForAppUpdate(): Promise<AppReleaseInfo | null> {
    // 1. Tenta o endpoint local do backend Rust (acesso direto, sem restrições de webview/CORS)
    try {
      const data = await http.get<any>('/api/app/check-update', {
        params: { current_version: CURRENT_APP_VERSION },
      });
      if (data) {
        return {
          currentVersion: data.current_version || CURRENT_APP_VERSION,
          latestVersion: data.latest_version || CURRENT_APP_VERSION,
          tagName: data.tag_name || `v${CURRENT_APP_VERSION}`,
          name: data.name || `Star Multlogin ${data.tag_name}`,
          body: data.body || '',
          publishedAt: data.published_at || '',
          htmlUrl: data.html_url || 'https://github.com/sr-satoru/antidetect-pro/releases',
          hasUpdate: !!data.has_update,
          downloadUrl: data.matched_asset?.download_url || data.assets?.[0]?.download_url,
          assetName: data.matched_asset?.name || data.assets?.[0]?.name,
          assetSize: data.matched_asset?.size_bytes || data.assets?.[0]?.size_bytes,
          platform: data.platform || 'desktop',
          arch: data.os_name || 'rust-backend',
        };
      }
    } catch (err) {
      console.warn('[App Update] Erro ao consultar backend local /api/app/check-update:', err);
    }

    // 2. Fallback nativo do Tauri
    try {
      const data = await tauriInvoke<any>('check_app_update');
      if (data && data.has_update) {
        return {
          currentVersion: data.current_version || CURRENT_APP_VERSION,
          latestVersion: data.latest_version || CURRENT_APP_VERSION,
          tagName: `v${data.latest_version || CURRENT_APP_VERSION}`,
          name: `Star Multlogin v${data.latest_version || CURRENT_APP_VERSION}`,
          body: data.body || '',
          publishedAt: data.date || '',
          htmlUrl: 'https://github.com/sr-satoru/antidetect-pro/releases',
          hasUpdate: true,
          platform: 'desktop',
          arch: 'rust-native',
        };
      }
    } catch (err) {
      console.warn('[Rust Updater] Falha no comando Tauri nativo:', err);
    }

    return {
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      tagName: `v${CURRENT_APP_VERSION}`,
      name: `Star Multlogin v${CURRENT_APP_VERSION}`,
      body: '',
      publishedAt: '',
      htmlUrl: '',
      hasUpdate: false,
      platform: 'desktop',
      arch: 'none',
    };
  },

  /**
   * Invoca o comando Rust nativo `start_app_download` e monitora eventos nativos `app-update-progress`
   */
  async startDownload(
    onProgress?: (progress: number, downloaded: number, total: number) => void,
    fallbackDownloadUrl?: string
  ): Promise<{ success: boolean; message: string; downloadedDirectly?: boolean }> {
    try {
      if (onProgress) {
        await tauriListen<any>('app-update-progress', (payload) => {
          onProgress(payload.progress, payload.downloaded_bytes, payload.total_bytes || 0);
        });
      }

      await tauriInvoke('start_app_download');
      return { success: true, message: 'Download e instalação iniciados pelo Rust nativo.' };
    } catch (err: any) {
      console.warn('[Rust Updater] Falha no comando Tauri nativo, acionando download direto:', err);
      if (fallbackDownloadUrl && typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = fallbackDownloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
        return {
          success: true,
          downloadedDirectly: true,
          message: 'Download do instalador oficial para sua máquina iniciado.',
        };
      }
      return {
        success: false,
        message: err?.message || String(err) || 'Falha ao solicitar download nativo em Rust.',
      };
    }
  },

  /**
   * Invoca o comando Rust nativo `restart_app` para reiniciar e aplicar a nova versão
   */
  async applyRestart(): Promise<boolean> {
    try {
      await tauriInvoke('restart_app');
      return true;
    } catch (err) {
      console.error('[Rust Updater] Falha ao solicitar reinício no Rust:', err);
      return false;
    }
  },
};

export default appUpdateService;
