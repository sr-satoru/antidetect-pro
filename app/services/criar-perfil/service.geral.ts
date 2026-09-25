/**
 * Service Geral (Criar Perfil) — Dados básicos / cadastrais do perfil.
 *
 * Corresponde ao componente geral.tsx (aba "Geral"):
 *   - Nome do perfil
 *   - Browser Kernel (SunBrowser / FlowerBrowser)
 *   - Sistema Operacional
 *   - User-Agent
 *   - Grupo e Tags
 *   - Cookies
 *   - Observação (notes)
 *
 * Extrai e formata esses dados do formulário para inclusão no payload do perfil.
 */

import { http } from '../http';

export interface DadosGeral {
  name: string;
  kernel: string;
  kernel_version: string;
  os: string;
  user_agent: string;
  user_agent_category: string;
  group: string;
  tags: string;
  cookies: string;
  notes: string;
  status: string;
}

export const serviceGeral = {
  /**
   * Extrai os dados da aba Geral do formulário de criação de perfil
   * em uma estrutura limpa e tipada.
   */
  extrairDadosGeral: (formData: any): DadosGeral => {
    let tagsString = '';
    if (Array.isArray(formData.tags)) {
      tagsString = formData.tags.join(',');
    } else if (formData.tags) {
      tagsString = String(formData.tags);
    }

    return {
      name: (formData.name && formData.name.trim()) || 'NOVO PERFIL',
      kernel: formData.kernel || 'Camoufox',
      kernel_version: formData.kernelVersion || '150',
      os: (formData.os || 'linux').toLowerCase(),
      user_agent: formData.userAgent || '',
      user_agent_category: formData.userAgentCategory || 'Todo',
      group: formData.group || 'Desagrupado',
      tags: tagsString,
      cookies: formData.cookies || '',
      notes: formData.notes || '',
      status: 'ready',
    };
  },

  /**
   * Envia o payload final do perfil montado ao backend.
   * O payload já vem pronto do impressaoDigitalService.montarPayloadPerfil().
   */
  create: (payload: any) =>
    http.post<any>('/api/profiles', payload),
};

export default serviceGeral;
