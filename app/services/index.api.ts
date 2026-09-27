/**
 * Barrel de Services — Ponto central de importação e facade para o backend Rust local.
 */

import { serviceGeral } from './criar-perfil/service.geral';
import { impressaoDigitalService } from './criar-perfil/service.impressoes';
import { serviceProxy } from './criar-perfil/service.proxy';
import { servicePerfis } from './perfis/service.perfis';
import { serviceTabs } from './perfis/service.tabs';
import { serviceCookies } from './perfis/service.cookies';
import { serviceTags } from './tags/service.tags';
import { http } from './http';

// Re-exporta serviços ativos
export { serviceGeral } from './criar-perfil/service.geral';
export { impressaoDigitalService } from './criar-perfil/service.impressoes';
export { serviceProxy } from './criar-perfil/service.proxy';
export { servicePerfis } from './perfis/service.perfis';
export { serviceTabs } from './perfis/service.tabs';
export { serviceCookies } from './perfis/service.cookies';
export { serviceTags } from './tags/service.tags';
export { http, ApiError } from './http';

/**
 * Objeto `api` — Facade central de chamadas à API do backend Rust local e serviços.
 */
export const api = {
  profiles: servicePerfis,
  tags: serviceTags,

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
    startLogin: () =>
      http.post<{ session_id: string; token: string; auth_url: string }>('/api/auth/start-login'),
    startRegister: () =>
      http.post<{ session_id: string; token: string; auth_url: string }>('/api/auth/start-register'),
    getSession: (sessionId: string) =>
      http.get<any>(`/api/auth/session/${sessionId}`),
    me: () => http.get<any>('/api/auth/me'),
    logout: () => http.post<any>('/api/auth/logout'),
  },

  impressoes: impressaoDigitalService,
};

export default api;

