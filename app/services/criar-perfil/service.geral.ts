import { http } from '../http';

/**
 * Service Geral (Criar Perfil)
 * Responsável por enviar a requisição de criação do perfil ao backend Rust.
 */
export const serviceGeral = {
  /**
   * Envia o payload final do perfil montado ao backend Rust.
   * O payload vem preparado pelo impressaoDigitalService.montarPayloadPerfil().
   */
  create: <T = any>(payload: any) =>
    http.post<T>('/api/profiles', payload),
};

export default serviceGeral;

