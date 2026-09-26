import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchChallenge,
  solveProofOfWork,
  exchangeDeviceCode,
  DEFAULT_CLOUD_URL,
} from '@/services/cloud-auth';

export interface UserSession {
  id: string;
  username: string;
  email?: string;
  plan?: string;
  profileLimit?: number;
  is_offline: boolean;
}

const DEFAULT_OFFLINE_USER: UserSession = {
  id: 'local_user',
  username: 'offline_user',
  email: undefined,
  plan: 'free',
  profileLimit: 0,
  is_offline: true,
};

interface AuthContextType {
  user: UserSession;
  token: string | null;
  isAuthenticated: boolean;
  isOffline: boolean;
  isOnline: boolean;
  isLoading: boolean;
  loginWithCode: (code: string) => Promise<void>;
  continueOffline: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserSession>(DEFAULT_OFFLINE_USER);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega a sessão salva no localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('fury_auth_token');
    const savedUser = localStorage.getItem('fury_auth_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('fury_auth_token');
        localStorage.removeItem('fury_auth_user');
        setUser(DEFAULT_OFFLINE_USER);
      }
    } else {
      setUser(DEFAULT_OFFLINE_USER);
    }
    setIsLoading(false);
  }, []);

  /**
   * Login intuitivo por Código de Vinculação com a Nuvem (Device-Code Flow estilo Donut)
   */
  const loginWithCode = async (code: string) => {
    // 1. Obter desafio de Proof-of-Work do servidor de nuvem
    const challenge = await fetchChallenge(DEFAULT_CLOUD_URL);

    // 2. Resolver o Proof-of-Work no navegador
    const nonce = await solveProofOfWork(
      challenge.prefix,
      challenge.difficulty,
    );

    // 3. Trocar o código pelo JWT real
    const response = await exchangeDeviceCode(
      code,
      challenge.challengeId,
      nonce,
      DEFAULT_CLOUD_URL,
    );

    const sessionUser: UserSession = {
      id: response.user.id,
      username:
        response.user.email?.split('@')[0] ||
        `user_${response.user.id.slice(0, 5)}`,
      email: response.user.email,
      plan: response.user.plan || 'pro',
      profileLimit: response.user.profileLimit,
      is_offline: false,
    };

    setToken(response.accessToken);
    setUser(sessionUser);
    localStorage.setItem('fury_auth_token', response.accessToken);
    localStorage.setItem('fury_auth_user', JSON.stringify(sessionUser));
  };

  /**
   * Usar o aplicativo localmente em modo offline
   */
  const continueOffline = () => {
    setToken(null);
    setUser(DEFAULT_OFFLINE_USER);
    localStorage.removeItem('fury_auth_token');
    localStorage.removeItem('fury_auth_user');
  };

  /**
   * Desconectar da nuvem
   */
  const logout = () => {
    setToken(null);
    setUser(DEFAULT_OFFLINE_USER);
    localStorage.removeItem('fury_auth_token');
    localStorage.removeItem('fury_auth_user');
  };

  const isOnline = !!token && !user.is_offline;
  const isOffline = !isOnline;
  const isAuthenticated = true;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isOffline,
        isOnline,
        isLoading,
        loginWithCode,
        continueOffline,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};

export default AuthProvider;
