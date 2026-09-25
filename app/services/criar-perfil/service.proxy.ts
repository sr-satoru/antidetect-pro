/**
 * Service Proxy (Criar Perfil) — Configuração de proxy na criação do perfil.
 *
 * Corresponde ao componente proxy.tsx (aba "Proxy"):
 *   - Listar proxies salvos para seleção rápida
 *   - Testar conexão do proxy configurado
 *   - Extrair dados de proxy do formulário
 */

import { http } from '../http';

export interface DadosProxy {
  proxy_mode: string;
  proxy_type: string;
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_password?: string;
  proxy_rotation_url?: string;
  ip_checker: string;
  socks_remote_dns: boolean;
}

export const serviceProxy = {
  /**
   * Carrega a lista de proxies salvos no banco para o dropdown de seleção.
   * Usado na aba Proxy quando o usuário quer reaproveitar um proxy existente.
   */
  listarSalvos: async () => {
    const list = await http.get<any[]>('/api/proxies');
    return list.map((p) => ({
      id: p.id,
      name: p.name || `Proxy ${p.host}`,
      type: p.type || 'socks5',
      host: p.host,
      port: String(p.port),
      user: p.username || '',
      pass: p.password || '',
      ip: p.exit_ip || p.host,
      country: p.country || 'BR - Brasil',
      status: p.status || 'active',
    }));
  },

  /**
   * Testa a conexão de um proxy informado na aba Proxy.
   */
  testar: (data: { type: string; host: string; port: number | string; username?: string; password?: string }) =>
    http.post<{ status: string; latency_ms: number | null; exit_ip: string | null; message: string }>(
      '/api/proxies/test',
      data
    ),

  /**
   * Extrai os dados de proxy do formulário de criação de perfil
   * em uma estrutura limpa e tipada.
   */
  extrairDadosProxy: (formData: any): DadosProxy => ({
    proxy_mode: formData.proxyMode || 'custom',
    proxy_type: formData.proxyType || 'none',
    proxy_host: formData.proxyHost || undefined,
    proxy_port: formData.proxyPort ? Number(formData.proxyPort) : undefined,
    proxy_username: formData.proxyUser || undefined,
    proxy_password: formData.proxyPass || undefined,
    proxy_rotation_url: formData.proxyRotationUrl || undefined,
    ip_checker: formData.ipChecker || 'IP2Location',
    socks_remote_dns: formData.socksRemoteDns ?? true,
  }),
};

export default serviceProxy;
