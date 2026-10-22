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
import { serviceAuth } from './auth/service.auth';
import { serviceMcp } from './mcp/service.mcp';
import { serviceSync } from './sync/service.sync';
import { wsService } from './ws/service.ws';
import { serviceGrupos } from './grupos/service.grupos';

// Re-exporta serviços ativos
export { serviceGeral } from './criar-perfil/service.geral';
export { impressaoDigitalService } from './criar-perfil/service.impressoes';
export { serviceProxies, serviceProxies as serviceProxy } from './proxies/service.proxies';
export { servicePerfis } from './perfis/service.perfis';
export { serviceTabs } from './perfis/service.tabs';
export { serviceCookies } from './perfis/service.cookies';
export { serviceTags } from './tags/service.tags';
export { serviceGrupos } from './grupos/service.grupos';
export { serviceExtensoes } from './extensoes/service.extensoes';
export { serviceCategorias } from './extensoes/service.categorias';
export { serviceAuth } from './auth/service.auth';
export { serviceMcp } from './mcp/service.mcp';
export { serviceSync } from './sync/service.sync';
export { wsService } from './ws/service.ws';
export { http, ApiError } from './http';

/**
 * Objeto `api` — Facade central de chamadas à API do backend Rust local e serviços.
 */
export const api = {
  profiles: servicePerfis,
  groups: serviceGrupos,
  tags: serviceTags,
  proxies: serviceProxies,
  extensions: serviceExtensoes,
  extensionCategories: serviceCategorias,
  auth: serviceAuth,
  mcp: serviceMcp,
  sync: serviceSync,
  ws: wsService,
  impressoes: impressaoDigitalService,
};

export default api;

