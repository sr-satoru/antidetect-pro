import { http } from '../http';

export interface AuthStartResponse {
  session_id: string;
  token: string;
  auth_url: string;
}

export interface SessionStatusResponse {
  status: 'authenticated' | 'pending';
  session_id: string;
  user: {
    id: string;
    email?: string;
    name?: string;
    plan?: string;
    max_profiles?: number;
    profile_count?: number;
  } | null;
  token: string | null;
  refresh_token: string | null;
}

export interface UserMeResponse {
  id: string;
  email: string | null;
  name: string;
  plan: string;
  max_profiles: number;
  profile_count: number;
  is_offline: boolean;
  token: string | null;
  refresh_token: string | null;
}

/**
 * Service de Autenticação — Comunica diretamente com as rotas /api/auth do daemon Rust local.
 * Toda persistência de sessão e cofre de tokens é de responsabilidade do Rust (VaultSessionStorage).
 */
export const serviceAuth = {
  /**
   * Inicia o fluxo OAuth 2.0 PKCE para Login no navegador externo
   */
  startLogin: (): Promise<AuthStartResponse> =>
    http.post<AuthStartResponse>('/api/auth/start-login'),

  /**
   * Inicia o fluxo OAuth 2.0 PKCE para Cadastro no navegador externo
   */
  startRegister: (): Promise<AuthStartResponse> =>
    http.post<AuthStartResponse>('/api/auth/start-register'),

  /**
   * Consulta o status de uma sessão PKCE pendente
   */
  getSessionStatus: (sessionId: string): Promise<SessionStatusResponse> =>
    http.get<SessionStatusResponse>(`/api/auth/session/${sessionId}`),

  /**
   * Retorna os dados do usuário atualmente logado ou usuário offline
   */
  getMe: (): Promise<UserMeResponse> =>
    http.get<UserMeResponse>('/api/auth/me'),

  /**
   * Encerra a sessão no backend Rust e expurga o cofre
   */
  logout: (): Promise<{ success: boolean }> =>
    http.post<{ success: boolean }>('/api/auth/logout'),
};

export default serviceAuth;
