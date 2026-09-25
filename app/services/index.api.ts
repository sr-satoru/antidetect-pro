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

// Re-exporta cada service
export { serviceGeral } from './criar-perfil/service.geral';
export { servicePlataforma } from './criar-perfil/service.plataforma';
export { impressaoDigitalService } from './criar-perfil/service.impressoes';
export { serviceAvancado } from './criar-perfil/service.avancado';
export { serviceProxy } from './criar-perfil/service.proxy';
export { http, ApiError } from './http';

/**
 * Objeto `api` — agrupa o que está disponível hoje (criar perfil).
 */
export const api = {
  profiles: {
    create: (data: any) => {
      const payload = impressaoDigitalService.montarPayloadPerfil(data);
      return serviceGeral.create(payload);
    },
  },
  proxies: {
    list: serviceProxy.listarSalvos,
    test: serviceProxy.testar,
  },
  impressoes: impressaoDigitalService,
  plataforma: servicePlataforma,
  avancado: serviceAvancado,
};

export default api;
