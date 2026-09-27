import { http } from '../http';
import type { ProxyItem, ProxyTestResult, TestProxyDto } from '@/types';

/**
 * Service Proxy (Criar Perfil / Proxies)
 * Gerencia a listagem e teste de proxies junto ao backend Rust.
 */
export const serviceProxy = {
  /**
   * Carrega a lista de proxies salvos no banco para o dropdown de seleção e listagem.
   */
  listarSalvos: async (): Promise<ProxyItem[]> => {
    const list = await http.get<ProxyItem[]>('/api/proxies');
    return list.map((p) => ({
      id: p.id,
      name: p.name || `Proxy ${p.host}`,
      type: p.type || p.proxy_type || 'socks5',
      host: p.host,
      port: String(p.port),
      user: p.user || p.username || '',
      pass: p.pass || p.password || '',
      ip: p.ip || p.host,
      country: p.country || 'BR - Brasil',
      status: p.status || 'active',
      created_at: p.created_at,
    }));
  },

  /**
   * Testa a conexão de um proxy informado via backend Rust.
   */
  testar: (data: TestProxyDto | { type?: string; proxy_type?: string; host: string; port: number | string; username?: string; password?: string; user?: string; pass?: string }) =>
    http.post<ProxyTestResult>('/api/proxies/test', data),
};

export default serviceProxy;

