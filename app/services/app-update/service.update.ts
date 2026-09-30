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
   * Invoca o comando Rust nativo `check_app_update` implementado em src-tauri
   */
  async checkForAppUpdate(): Promise<AppReleaseInfo | null> {
    try {
      const data = await tauriInvoke<any>('check_app_update');
      if (data) {
        return {
          currentVersion: data.current_version || CURRENT_APP_VERSION,
          latestVersion: data.latest_version || CURRENT_APP_VERSION,
          tagName: `v${data.latest_version || CURRENT_APP_VERSION}`,
          name: `Star Multlogin v${data.latest_version || CURRENT_APP_VERSION}`,
          body: data.body || '',
          publishedAt: data.date || '',
          htmlUrl: 'https://github.com/sr-satoru/antidetect-pro/releases',
          hasUpdate: !!data.has_update,
          platform: 'desktop',
          arch: 'rust-native',
        };
      }
    } catch (err) {
      console.warn('[Rust Updater] Erro ao invocar check_app_update no Tauri:', err);
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
      platform: 'web',
      arch: 'web',
    };
  },

  /**
   * Invoca o comando Rust nativo `start_app_download` e monitora eventos nativos `app-update-progress`
   */
  async startDownload(
    onProgress?: (progress: number, downloaded: number, total: number) => void
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (onProgress) {
        await tauriListen<any>('app-update-progress', (payload) => {
          onProgress(payload.progress, payload.downloaded_bytes, payload.total_bytes || 0);
        });
      }

      await tauriInvoke('start_app_download');
      return { success: true, message: 'Download e instalação iniciados pelo Rust nativo.' };
    } catch (err: any) {
      console.error('[Rust Updater] Falha ao iniciar download no Rust:', err);
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
