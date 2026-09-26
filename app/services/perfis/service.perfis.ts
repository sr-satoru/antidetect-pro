import { http } from '../http';
import { impressaoDigitalService } from '../criar-perfil/service.impressoes';
import { serviceGeral } from '../criar-perfil/service.geral';
import { serviceTabs } from './service.tabs';
import { serviceCookies } from './service.cookies';

/**
 * Service dedicado e desacoplado para todas as operações de Perfis.
 * Centraliza comunicação com o backend e regras de payload.
 */
export const servicePerfis = {
  // Listagem com filtros
  list: (search?: string, group?: string) =>
    http.get<any[]>('/api/profiles', {
      params: {
        search: search || undefined,
        group: group !== 'Todos os grupos' ? group : undefined,
      },
    }),

  // Obter perfil completo por ID
  get: (id: string | number) => http.get<any>(`/api/profiles/${id}`),

  // Criação de perfil estruturado
  create: (data: any) => {
    const payload = impressaoDigitalService.montarPayloadPerfil(data);
    return serviceGeral.create(payload);
  },

  // Atualização de perfil
  update: (id: string | number, data: any) => {
    const payload =
      data.fingerprint_json || (data.name && Object.keys(data).length <= 4)
        ? data
        : impressaoDigitalService.montarPayloadPerfil(data);
    return http.put<any>(`/api/profiles/${id}`, payload);
  },

  // Clonagem / Duplicação atômica no backend (cria novo UUID, copia metadados e disco)
  clone: (id: string | number) => http.post<any>(`/api/profiles/${id}/clone`),

  // Mover para lixeira (Soft Delete)
  delete: (id: string | number) => http.delete<any>(`/api/profiles/${id}`),

  // Disparar Camoufox
  launch: (id: string | number) => http.post<any>(`/api/profiles/${id}/launch`),

  // Parar Camoufox
  stop: (id: string | number) => http.post<any>(`/api/profiles/${id}/stop`),

  // Operações de Lixeira
  listTrash: () => http.get<any[]>('/api/profiles/trash'),
  restore: (id: string | number) => http.post<any>(`/api/profiles/${id}/restore`),
  deletePermanent: (id: string | number) =>
    http.delete<any>(`/api/profiles/${id}/permanent`),
  emptyTrash: () => http.delete<any>('/api/profiles/trash/empty'),

  // Abas abertas (delegado ao módulo serviceTabs)
  getTabs: serviceTabs.getTabs,
  openTab: serviceTabs.openTab,
  closeTab: serviceTabs.closeTab,

  // Cookies (delegado ao módulo serviceCookies)
  getCookies: serviceCookies.getCookies,
  importCookies: serviceCookies.importCookies,
  clearCookies: serviceCookies.clearCookies,
  exportCookiesToFile: serviceCookies.exportCookiesToFile,

  // Sincronização em Nuvem (E2EE < 1 MB)
  syncToCloud: (id: string | number) =>
    http.post<any>(`/api/cloud-sync/${id}/sync`),
  restoreFromCloud: (id: string | number) =>
    http.post<any>(`/api/cloud-sync/${id}/restore`),
  getCloudStat: (id: string | number) =>
    http.get<any>(`/api/cloud-sync/${id}/stat`),
};

export default servicePerfis;
