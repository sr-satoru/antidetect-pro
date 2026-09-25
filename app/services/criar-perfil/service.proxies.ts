/**
 * Service Proxies (Criar Perfil) — Teste de proxy na tela de criação.
 * Focado exclusivamente no teste de conexão ao configurar o proxy do perfil.
 */

import { http } from '../http';

export const serviceProxies = {
  /**
   * Testa a conexão de um proxy informado na aba Proxy da criação de perfil.
   */
  test: (data: any) =>
    http.post<{ status: string; latency_ms: number | null; exit_ip: string | null; message: string }>(
      '/api/proxies/test',
      data
    ),
};

export default serviceProxies;
