import React, { createContext, useContext, useState, useEffect } from 'react';
import { serviceAuth } from '@/services/auth/service.auth';

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
  setCloudSession: (user: any, token: string) => void;
  continueOffline: () => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserSession>(DEFAULT_OFFLINE_USER);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessionFromBackend = async () => {
    try {
      const backendUser = await serviceAuth.getMe();
      if (backendUser && !backendUser.is_offline && backendUser.email) {
        const sessionUser: UserSession = {
          id: String(backendUser.id || 'cloud_user'),
          username: backendUser.name || backendUser.email.split('@')[0] || 'user',
          email: backendUser.email,
          plan: backendUser.plan || 'pro',
          profileLimit: backendUser.max_profiles ?? 10,
          is_offline: false,
        };
        setUser(sessionUser);
        setToken(backendUser.token || null);
        return true;
      } else {
        setUser(DEFAULT_OFFLINE_USER);
        setToken(null);
      }
    } catch (err) {
      console.warn('Backend local offline ou inacessível ao sincronizar sessão:', err);
    }
    return false;
  };

  // Inicializa a sessão consultando a fonte única da verdade: o backend Rust (Vault SQLite)
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      await fetchSessionFromBackend();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Define a sessão vinda do fluxo OAuth 2.0 PKCE concluído
   */
  const setCloudSession = (cloudUser: any, sessionToken: string) => {
    const sessionUser: UserSession = {
      id: String(cloudUser.id),
      username:
        cloudUser.name ||
        cloudUser.username ||
        cloudUser.email?.split('@')[0] ||
        'user',
      email: cloudUser.email,
      plan: cloudUser.plan || 'pro',
      profileLimit: cloudUser.max_profiles ?? cloudUser.profileLimit ?? 10,
      is_offline: false,
    };

    setToken(sessionToken);
    setUser(sessionUser);
  };

  /**
   * Usar o aplicativo localmente em modo offline
   */
  const continueOffline = () => {
    setToken(null);
    setUser(DEFAULT_OFFLINE_USER);
  };

  /**
   * Desconectar da nuvem (limpa o cofre do backend Rust e a memória local)
   */
  const logout = async () => {
    try {
      await serviceAuth.logout();
    } catch {}
    setToken(null);
    setUser(DEFAULT_OFFLINE_USER);
  };

  const isOnline = !user.is_offline;
  const isOffline = !isOnline;
  const isAuthenticated = isOnline;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isOffline,
        isOnline,
        isLoading,
        setCloudSession,
        continueOffline,
        logout,
        refreshSession: fetchSessionFromBackend,
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
