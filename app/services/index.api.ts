/**
 * Barrel de Services — Ponto central de importação e facade para o backend Rust local.
 */

import { serviceGeral } from './criar-perfil/service.geral';
import { impressaoDigitalService } from './criar-perfil/service.impressoes';
import { serviceProxies } from './proxies/service.proxies';
import { servicePerfis } from './perfis/service.perfis';
import { serviceTabs } from './perfis/service.tabs';
import { serviceCookies } from './perfis/service.cookies';
import { serviceTags } from './tags/service.tags';
import { http } from './http';

import { serviceExtensoes } from './extensoes/service.extensoes';
import { serviceCategorias } from './extensoes/service.categorias';

// Re-exporta serviços ativos
export { serviceGeral } from './criar-perfil/service.geral';
export { impressaoDigitalService } from './criar-perfil/service.impressoes';
export { serviceProxies, serviceProxies as serviceProxy } from './proxies/service.proxies';
export { servicePerfis } from './perfis/service.perfis';
export { serviceTabs } from './perfis/service.tabs';
export { serviceCookies } from './perfis/service.cookies';
export { serviceTags } from './tags/service.tags';
export { serviceExtensoes } from './extensoes/service.extensoes';
export { serviceCategorias } from './extensoes/service.categorias';
export { http, ApiError } from './http';

/**
 * Objeto `api` — Facade central de chamadas à API do backend Rust local e serviços.
 */
export const api = {
  profiles: servicePerfis,
  tags: serviceTags,
  proxies: serviceProxies,

  extensions: serviceExtensoes,
  extensionCategories: serviceCategorias,

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

