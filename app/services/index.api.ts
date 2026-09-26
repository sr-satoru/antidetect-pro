/**
 * Barrel de Services — ponto central de importação.
 *
 * Cada service em /services/criar-perfil/ corresponde 1:1 a um
 * componente em /components/criar-perfil/:
 *
 *   service.geral.ts       ↔  geral.tsx
 *   service.proxy.ts       ↔  proxy.tsx
 *   service.impressoes.ts  ↔  impressoes.tsx
 *   service.plataforma.ts  ↔  plataforma.tsx
 *   service.avancado.ts    ↔  avancado.tsx
 *
 * TODO: Criar módulos futuros para:
 *   - Perfis (list, get, update, delete, trash, launch)
 *   - Extensões (CRUD, catálogo)
 *   - Proxies (CRUD)
 *   - Auth (login, register, me)
 */

import { serviceGeral } from './criar-perfil/service.geral';
import { servicePlataforma } from './criar-perfil/service.plataforma';
import { impressaoDigitalService } from './criar-perfil/service.impressoes';
import { serviceAvancado } from './criar-perfil/service.avancado';
import { serviceProxy } from './criar-perfil/service.proxy';
import { http } from './http';

// Re-exporta cada service
export { serviceGeral } from './criar-perfil/service.geral';
export { servicePlataforma } from './criar-perfil/service.plataforma';
export { impressaoDigitalService } from './criar-perfil/service.impressoes';
export { serviceAvancado } from './criar-perfil/service.avancado';
export { serviceProxy } from './criar-perfil/service.proxy';
export { http, ApiError } from './http';

/**
 * Objeto `api` — Ponto central de chamadas à API do backend local e serviços.
 */
export const api = {
  profiles: {
    list: (search?: string, group?: string) =>
      http.get<any[]>('/api/profiles', {
        params: {
          search: search || undefined,
          group: group !== 'Todos os grupos' ? group : undefined,
        },
      }),
    create: (data: any) => {
      const payload = impressaoDigitalService.montarPayloadPerfil(data);
      return serviceGeral.create(payload);
    },
    get: (id: string | number) => http.get<any>(`/api/profiles/${id}`),
    update: (id: string | number, data: any) =>
      http.put<any>(`/api/profiles/${id}`, data),
    delete: (id: string | number) =>
      http.delete<any>(`/api/profiles/${id}`),
    launch: (id: string | number) =>
      http.post<any>(`/api/profiles/${id}/launch`),
    stop: (id: string | number) =>
      http.post<any>(`/api/profiles/${id}/stop`),
    listTrash: () => http.get<any[]>('/api/profiles/trash'),
    restore: (id: string | number) =>
      http.post<any>(`/api/profiles/${id}/restore`),
    deletePermanent: (id: string | number) =>
      http.delete<any>(`/api/profiles/${id}/permanent`),
    emptyTrash: () => http.delete<any>('/api/profiles/trash/empty'),

    // Abas e URLs abertas em tempo real
    getTabs: (id: string | number) =>
      http.get<{
        is_running: boolean;
        port: number | null;
        tabs: Array<{ id: string; url: string; title: string; is_active: boolean }>;
      }>(`/api/profiles/${id}/tabs`),
    openTab: (id: string | number, url: string) =>
      http.post<{ status: string; context_id: string; url: string }>(
        `/api/profiles/${id}/tabs`,
        { url },
      ),
    closeTab: (id: string | number, tabId: string) =>
      http.delete<{ status: string; tab_id: string }>(
        `/api/profiles/${id}/tabs/${tabId}`,
      ),

    // Gerenciador e Importador de Cookies (SQLite moz_cookies)
    getCookies: (id: string | number) =>
      http.get<{
        total_count: number;
        domains: Array<{ domain: string; count: number }>;
        cookies: any[];
      }>(`/api/profiles/${id}/cookies`),
    importCookies: (id: string | number, cookiesRaw: string) =>
      http.post<{ imported: number; skipped: number; errors: string[] }>(
        `/api/profiles/${id}/cookies`,
        { cookies_raw: cookiesRaw },
      ),
    clearCookies: (id: string | number) =>
      http.delete<{ status: string; deleted_count: number }>(
        `/api/profiles/${id}/cookies`,
      ),
  },

  proxies: {
    list: serviceProxy.listarSalvos,
    test: serviceProxy.testar,
    create: (data: any) => http.post<any>('/api/proxies', data),
    delete: (id: string | number) => http.delete<any>(`/api/proxies/${id}`),
  },

  extensions: {
    list: () => http.get<any[]>('/api/extensions'),
    create: (data: any) => http.post<any>('/api/extensions', data),
    update: (id: string | number, data: any) =>
      http.put<any>(`/api/extensions/${id}`, data),
    delete: (id: string | number) =>
      http.delete<any>(`/api/extensions/${id}`),
    getCatalog: (params?: any) =>
      http.get<any[]>('/api/extensions/catalog', { params }),
  },

  auth: {
    login: (login: string, pass: string) =>
      http.post<any>('/api/auth/login', { login, password: pass }),
    register: (data: any) => http.post<any>('/api/auth/register', data),
    me: () => http.get<any>('/api/auth/me'),
  },

  impressoes: impressaoDigitalService,
  plataforma: servicePlataforma,
  avancado: serviceAvancado,
};

export default api;
