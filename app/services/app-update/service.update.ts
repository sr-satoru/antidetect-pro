import packageInfo from '../../package.json';
import { http } from '../http';

export interface AppAsset {
  name: string;
  download_url: string;
  size_bytes: u64number;
  format: 'appimage' | 'deb' | 'rpm' | 'exe' | 'msi' | 'dmg' | 'targz' | 'unknown';
}

type u64number = number;

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
  detectedFormat?: string;
  detectionReason?: string;
  compatibleAssets?: AppAsset[];
}

export interface AppDownloadStatus {
  is_downloading: boolean;
  stage: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_mb_s: number;
  eta_seconds: number;
  file_path?: string;
  error?: string;
}

export const CURRENT_APP_VERSION: string = packageInfo.version || '0.1.22';

const tauriInvoke = async <T>(cmd: string, args?: Record<string, any>): Promise<T | null> => {
  if (typeof window !== 'undefined' && (window as any).__TAURI__?.core?.invoke) {
    try {
      return await (window as any).__TAURI__.core.invoke(cmd, args);
    } catch {
      return null;
    }
  }
  return null;
};

export const appUpdateService = {
  /**
   * Verifica se há atualizações do aplicativo Star Multlogin consultando o daemon
   * local Rust (/api/app/check-update) com detecção exata do formato de pacote.
   */
  async checkForAppUpdate(format?: string): Promise<AppReleaseInfo | null> {
    try {
      const data = await http.get<any>('/api/app/check-update', {
        params: {
          current_version: CURRENT_APP_VERSION,
          format: format || undefined,
        },
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
          detectedFormat: data.detected_format,
          detectionReason: data.detection_reason,
          compatibleAssets: data.compatible_assets || [],
        };
      }
    } catch (err) {
      console.warn('[App Update] Erro ao consultar backend local /api/app/check-update:', err);
    }

    // Fallback nativo
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
          detectedFormat: 'unknown',
          detectionReason: 'Tauri Native Fallback',
          compatibleAssets: [],
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
      detectedFormat: 'unknown',
      detectionReason: '',
      compatibleAssets: [],
    };
  },

  /**
   * Dispara o download de atualização no daemon Rust com streaming de progresso em tempo real
   */
  async startDownload(
    onProgress?: (status: AppDownloadStatus) => void,
    selectedAsset?: { url: string; name: string }
  ): Promise<{ success: boolean; message: string; downloadedDirectly?: boolean }> {
    try {
      // 1. Aciona o backend Rust /api/app/download
      const res = await http.post<any>('/api/app/download', {
        url: selectedAsset?.url,
        name: selectedAsset?.name,
      });

      if (res && res.success) {
        // Inicia loop de polling de alta precisão
        if (onProgress) {
          const pollInterval = setInterval(async () => {
            try {
              const st = await http.get<AppDownloadStatus>('/api/app/download-status');
              if (st) {
                onProgress(st);
                if (!st.is_downloading && (st.stage === 'ready' || st.stage === 'error' || st.stage === 'cancelled')) {
                  clearInterval(pollInterval);
                }
              }
            } catch {
              // ignora erro transitório
            }
          }, 350);
        }

        return {
          success: true,
          message: res.message || 'Download iniciado no backend Rust com sucesso.',
        };
      }
    } catch (err: any) {
      console.warn('[App Update] Erro ao acionar /api/app/download no daemon:', err);
    }

    // 2. Fallback de download direto pelo navegador se o backend estiver inacessível
    if (selectedAsset?.url && typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = selectedAsset.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      return {
        success: true,
        downloadedDirectly: true,
        message: 'Download direto do instalador iniciado pelo seu navegador.',
      };
    }

    return {
      success: false,
      message: 'Não foi possível iniciar o download da atualização.',
    };
  },

  /**
   * Cancela o download em andamento
   */
  async cancelDownload(): Promise<boolean> {
    try {
      const res = await http.post<any>('/api/app/cancel-download');
      return !!res?.success;
    } catch {
      return false;
    }
  },

  /**
   * Reinicia a aplicação caso esteja rodando sob o runtime do Tauri
   */
  async applyRestart(): Promise<boolean> {
    try {
      await tauriInvoke('restart_app');
      return true;
    } catch {
      return false;
    }
  },
};

export default appUpdateService;
