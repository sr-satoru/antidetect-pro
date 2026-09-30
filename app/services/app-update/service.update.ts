import packageInfo from '../../package.json';
import { http } from '../http';

export const CURRENT_APP_VERSION: string = packageInfo.version || '0.1.24';

export interface AppAsset {
  name: string;
  download_url: string;
  size_bytes: number;
  format: string;
}

export interface AppReleaseInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  tagName: string;
  name: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  detectedFormat?: string;
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

export const appUpdateService = {
  /**
   * Consulta a última versão e detecta o pacote correspondente ao formato do app atual
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
          hasUpdate: !!data.has_update,
          currentVersion: data.current_version || CURRENT_APP_VERSION,
          latestVersion: data.latest_version || CURRENT_APP_VERSION,
          tagName: data.tag_name || `v${CURRENT_APP_VERSION}`,
          name: data.name || `Star Multlogin ${data.tag_name}`,
          downloadUrl: data.matched_asset?.download_url,
          assetName: data.matched_asset?.name,
          assetSize: data.matched_asset?.size_bytes,
          detectedFormat: data.detected_format,
          compatibleAssets: data.compatible_assets || [],
        };
      }
    } catch (err) {
      console.warn('[App Update] Erro ao consultar /api/app/check-update:', err);
    }
    return null;
  },

  /**
   * Inicia o download do arquivo de atualização com streaming e polling de progresso
   */
  async startDownload(
    onProgress?: (status: AppDownloadStatus) => void,
    asset?: { url: string; name: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await http.post<any>('/api/app/download', {
        url: asset?.url,
        name: asset?.name,
      });

      if (res && res.success) {
        if (onProgress) {
          const timer = setInterval(async () => {
            try {
              const st = await http.get<AppDownloadStatus>('/api/app/download-status');
              if (st) {
                onProgress(st);
                if (!st.is_downloading && (st.stage === 'ready' || st.stage === 'error' || st.stage === 'cancelled')) {
                  clearInterval(timer);
                }
              }
            } catch {
              // ignora falha transitória de poll
            }
          }, 350);
        }

        return { success: true, message: 'Download iniciado com sucesso.' };
      }
    } catch (err: any) {
      console.warn('[App Update] Erro ao iniciar download:', err);
    }
    return { success: false, message: 'Falha ao iniciar o download.' };
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
   * Aplica a atualização: instala o .deb no sistema ou executa o novo binário e reinicia o app
   */
  async applyRestart(filePath?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await http.post<any>('/api/app/apply-update', {
        file_path: filePath,
      });
      if (res && res.success) {
        return {
          success: true,
          message: res.message || 'Instalando atualização e reiniciando...',
        };
      }
      return {
        success: false,
        message: res?.message || 'Falha ao aplicar a atualização.',
      };
    } catch (err: any) {
      console.warn('[App Update] Erro ao aplicar atualização:', err);
      return {
        success: false,
        message: 'Erro ao comunicar com o servidor de atualização.',
      };
    }
  },
};

export default appUpdateService;
