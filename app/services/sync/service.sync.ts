import { http } from '../http';

export interface CloudHealthResponse {
  cloud_online: boolean;
  cloud_url?: string;
  authenticated?: boolean;
}

export interface CloudSyncResult {
  success: boolean;
  downloaded_count?: number;
  uploaded_count?: number;
  message?: string;
}

export interface ProfileCloudStat {
  profile_id: string;
  has_cloud_backup: boolean;
  remote_size_kb?: number;
  last_synced_at?: number;
}

// Estado reativo desacoplado da UI
let isSyncingActive = false;
const syncListeners = new Set<(isSyncing: boolean) => void>();

function notifySyncListeners(state: boolean) {
  isSyncingActive = state;
  syncListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (e) {
      console.error('[serviceSync] Erro no listener:', e);
    }
  });
}

/**
 * Service dedicado para Sincronização em Nuvem e Health Check.
 * Todas as operações delegam para o backend Rust local que usa o Vault seguro para falar com a VPS.
 */
export const serviceSync = {
  /**
   * Consulta o estado atual de sincronização
   */
  getIsSyncing: (): boolean => isSyncingActive,

  /**
   * Assina atualizações do estado de sincronização (para spinners e indicadores na UI)
   */
  subscribeSyncState: (listener: (isSyncing: boolean) => void): (() => void) => {
    syncListeners.add(listener);
    listener(isSyncingActive);
    return () => {
      syncListeners.delete(listener);
    };
  },

  /**
   * Sincronização inteligente com a VPS:
   * 1. Ativa o spinner na tabela e cabeçalho (isSyncing = true)
   * 2. Dispara o backend Rust para baixar e salvar perfis no SQLite
   * 3. Invoca o callback onProfilesUpdated() para atualizar a lista local sem F5
   * 4. Desliga o spinner apenas quando a confirmação do backend é finalizada
   */
  syncProfiles: async (
    onProfilesUpdated?: () => void,
    force = false,
  ): Promise<CloudSyncResult> => {
    if (isSyncingActive) {
      return { success: true, message: 'Sincronização já em andamento' };
    }

    notifySyncListeners(true);
    try {
      const result = await http.post<CloudSyncResult>(
        `/api/cloud-sync/pull${force ? '?force=true' : ''}`,
      );
      if (onProfilesUpdated) {
        onProfilesUpdated();
      }
      return result;
    } catch (err: any) {
      console.warn('[serviceSync] Falha na sincronização com a nuvem:', err);
      throw err;
    } finally {
      notifySyncListeners(false);
    }
  },

  /**
   * Checa se a VPS/Cloud está acessível e se o daemon está conectado
   */
  checkHealth: (): Promise<CloudHealthResponse> =>
    http.get<CloudHealthResponse>('/api/cloud-sync/health'),

  /**
   * Dispara a Sincronização atômica com a Nuvem (Download de perfis ausentes + Upload dos locais)
   */
  twoWaySync: (force = false): Promise<CloudSyncResult> =>
    http.post<CloudSyncResult>(`/api/cloud-sync/pull${force ? '?force=true' : ''}`),

  /**
   * Puxa perfis da nuvem para o disco local
   */
  pull: (force = false): Promise<CloudSyncResult> =>
    http.post<CloudSyncResult>(`/api/cloud-sync/pull${force ? '?force=true' : ''}`),

  /**
   * Envia backup cifrado de um perfil específico para a nuvem
   */
  syncToCloud: (profileId: string | number): Promise<any> =>
    http.post<any>(`/api/cloud-sync/${profileId}/sync`),

  /**
   * Restaura backup de um perfil específico da nuvem
   */
  restoreFromCloud: (profileId: string | number): Promise<any> =>
    http.post<any>(`/api/cloud-sync/${profileId}/restore`),

  /**
   * Consulta status de sincronização de um perfil específico
   */
  getStat: (profileId: string | number): Promise<ProfileCloudStat> =>
    http.get<ProfileCloudStat>(`/api/cloud-sync/${profileId}/stat`),
};

export default serviceSync;
