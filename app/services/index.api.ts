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
import { servicePerfis } from './perfis/service.perfis';
import { serviceTabs } from './perfis/service.tabs';
import { serviceCookies } from './perfis/service.cookies';
import { http } from './http';

// Re-exporta cada service
export { serviceGeral } from './criar-perfil/service.geral';
export { servicePlataforma } from './criar-perfil/service.plataforma';
export { impressaoDigitalService } from './criar-perfil/service.impressoes';
export { serviceAvancado } from './criar-perfil/service.avancado';
export { serviceProxy } from './criar-perfil/service.proxy';
export { servicePerfis } from './perfis/service.perfis';
export { serviceTabs } from './perfis/service.tabs';
export { serviceCookies } from './perfis/service.cookies';
export { http, ApiError } from './http';

/**
 * Objeto `api` — Ponto central de chamadas à API do backend local e serviços.
 */
export const api = {
  profiles: servicePerfis,

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
