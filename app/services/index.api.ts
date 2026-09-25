/**
 * Barrel de Services — ponto central de importação.
 *
 * Services de criação de perfil ficam em /services/criar-perfil/.
 * Os módulos de listagem, exclusão, auth, extensões e proxies
 * serão criados futuramente em arquivos dedicados.
 */

import { serviceGeral } from './criar-perfil/service.geral';
import { servicePlataforma } from './criar-perfil/service.plataforma';
import { impressaoDigitalService } from './criar-perfil/service.impressoes.digital';
import { serviceAvancado } from './criar-perfil/service.avancado';
import { serviceProxies } from './criar-perfil/service.proxies';

// Re-exporta cada service de criação de perfil
export { serviceGeral } from './criar-perfil/service.geral';
export { servicePlataforma } from './criar-perfil/service.plataforma';
export { impressaoDigitalService } from './criar-perfil/service.impressoes.digital';
export { serviceAvancado } from './criar-perfil/service.avancado';
export { serviceProxies } from './criar-perfil/service.proxies';
export { http, ApiError } from './http';

/**
 * Objeto `api` — agrupa o que está disponível hoje.
 *
 * TODO: Criar módulos futuros para:
 *   - profiles (list, get, update, delete, trash, launch)
 *   - extensions (CRUD, catálogo)
 *   - proxies (CRUD)
 *   - auth (login, register, me)
 */
export const api = {
  profiles: {
    create: (data: any) => {
      const payload = impressaoDigitalService.montarPayloadPerfil(data);
      return serviceGeral.create(payload);
    },
  },
  proxies: {
    test: serviceProxies.test,
  },
  impressoes: impressaoDigitalService,
  plataforma: servicePlataforma,
  avancado: serviceAvancado,
};

export default api;
