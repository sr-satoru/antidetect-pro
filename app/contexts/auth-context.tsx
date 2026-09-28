import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const savedToken = localStorage.getItem('star_auth_token');
    const savedUser = localStorage.getItem('star_auth_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('star_auth_token');
        localStorage.removeItem('star_auth_user');
        setUser(DEFAULT_OFFLINE_USER);
      }
    } else {
      setUser(DEFAULT_OFFLINE_USER);
    }
    setIsLoading(false);
  }, []);



  /**
   * Define a sessão vinda diretamente do fluxo OAuth 2.0 Web
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
    localStorage.setItem('star_auth_token', sessionToken);
    localStorage.setItem('star_auth_user', JSON.stringify(sessionUser));
  };

  /**
   * Usar o aplicativo localmente em modo offline
   */
  const continueOffline = () => {
    setToken(null);
    setUser(DEFAULT_OFFLINE_USER);
    localStorage.removeItem('star_auth_token');
    localStorage.removeItem('star_auth_user');
  };

  /**
   * Desconectar da nuvem
   */
  const logout = () => {
    setToken(null);
    setUser(DEFAULT_OFFLINE_USER);
    localStorage.removeItem('star_auth_token');
    localStorage.removeItem('star_auth_user');
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
        setCloudSession,
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
