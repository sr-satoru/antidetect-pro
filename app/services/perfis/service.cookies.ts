import { http } from '../http';

export interface UnifiedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expiry?: number;
  is_secure: boolean;
  is_http_only: boolean;
  same_site: string;
}

export interface DomainSummary {
  domain: string;
  count: number;
}

export interface CookieStatsResponse {
  total_count: number;
  domains: DomainSummary[];
  cookies: UnifiedCookie[];
}

export interface ImportCookieResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const serviceCookies = {
  /**
   * Consulta estatísticas e lista de cookies do perfil
   */
  async getCookies(profileId: string | number): Promise<CookieStatsResponse> {
    return http.get<CookieStatsResponse>(`/api/profiles/${profileId}/cookies`);
  },

  /**
   * Importa cookies em formato JSON ou Netscape cookies.txt diretamente no SQLite do perfil
   */
  async importCookies(profileId: string | number, cookiesRaw: string): Promise<ImportCookieResult> {
    return http.post<ImportCookieResult>(`/api/profiles/${profileId}/cookies`, {
      cookies_raw: cookiesRaw,
    });
  },

  /**
   * Limpa todos os cookies gravados no SQLite do perfil
   */
  async clearCookies(profileId: string | number): Promise<{ status: string; deleted_count: number }> {
    return http.delete<{ status: string; deleted_count: number }>(`/api/profiles/${profileId}/cookies`);
  },

  /**
   * Gera o download do JSON de cookies do perfil no cliente
   */
  exportCookiesToFile(cookies: UnifiedCookie[], profileName?: string) {
    if (!cookies || cookies.length === 0) {
      throw new Error('Nenhum cookie para exportar.');
    }
    const jsonStr = JSON.stringify(cookies, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies_${profileName || 'perfil'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
