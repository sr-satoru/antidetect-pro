/**
 * Service Plataforma — Contas de plataforma (login, cookies, URLs).
 *
 * Gerencia as contas de login salvas no perfil do navegador:
 * - Plataformas onde a pessoa fez login (Facebook, Google, etc.)
 * - Cookies e credenciais associados a cada conta
 * - URLs das páginas que abrem automaticamente ao iniciar o perfil
 * - Regras de verificação de duplicidade
 *
 * Esses dados são enviados como parte do payload do perfil
 * (dentro de fingerprint_json) via service.geral → POST /api/profiles.
 */

export interface ContaPlataforma {
  id: string;
  platform: string;
  customDomain?: string;
  username: string;
  password: string;
  twoFactorKey?: string;
}

export interface DuplicateCheckRules {
  usernamePassword: boolean;
  cookie: boolean;
  cUser: boolean;
}

export interface PlataformaData {
  platformUrl?: string;
  platformAccounts: ContaPlataforma[];
  duplicateCheckRules: DuplicateCheckRules;
  openTabsUrls?: string;
  cookies?: string;
}

export const servicePlataforma = {
  /**
   * Extrai os dados de plataforma do formulário de criação de perfil
   * em uma estrutura limpa e tipada.
   */
  extrairDadosPlataforma: (formData: any): PlataformaData => {
    const accounts: ContaPlataforma[] = (formData.platformAccounts || []).map((acc: any) => ({
      id: acc.id || String(Date.now()),
      platform: acc.platform || 'other',
      customDomain: acc.customDomain || undefined,
      username: acc.username || '',
      password: acc.password || '',
      twoFactorKey: acc.twoFactorKey || undefined,
    }));

    return {
      platformUrl: formData.platformUrl || undefined,
      platformAccounts: accounts,
      duplicateCheckRules: {
        usernamePassword: formData.duplicateCheckRules?.usernamePassword ?? true,
        cookie: formData.duplicateCheckRules?.cookie ?? true,
        cUser: formData.duplicateCheckRules?.cUser ?? true,
      },
      openTabsUrls: formData.openTabsUrls || undefined,
      cookies: formData.cookies || undefined,
    };
  },

  /**
   * Valida se as contas de plataforma estão preenchidas corretamente.
   * Retorna lista de erros (vazia se tudo OK).
   */
  validarContas: (accounts: ContaPlataforma[]): string[] => {
    const erros: string[] = [];

    accounts.forEach((acc, idx) => {
      if (acc.platform === 'other' && (!acc.customDomain || !acc.customDomain.trim())) {
        erros.push(`Conta ${idx + 1}: domínio da plataforma é obrigatório.`);
      }
    });

    return erros;
  },

  /**
   * Monta o fragmento de plataforma para inclusão no payload do perfil.
   * Usado pelo service.geral ou service.impressoes.digital ao criar/atualizar perfil.
   */
  montarPayloadPlataforma: (formData: any) => {
    const dados = servicePlataforma.extrairDadosPlataforma(formData);

    return {
      platform_url: dados.platformUrl || null,
      platform_accounts: dados.platformAccounts,
      open_tabs_urls: dados.openTabsUrls || null,
      cookies: dados.cookies || null,
      duplicate_check_rules: dados.duplicateCheckRules,
    };
  },
};

export default servicePlataforma;
