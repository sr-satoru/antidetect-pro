import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/index.api';

export interface UserSession {
  id: number | string;
  username: string;
  email?: string;
  is_offline: boolean;
}

const DEFAULT_OFFLINE_USER: UserSession = {
  id: 'local_user',
  username: 'offline_user',
  email: undefined,
  is_offline: true,
};

interface AuthContextType {
  user: UserSession;
  token: string | null;
  isAuthenticated: boolean;
  isOffline: boolean;
  isOnline: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { username?: string; email?: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserSession>(DEFAULT_OFFLINE_USER);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializa a sessão a partir do localStorage ou define Modo Offline por padrão
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

  const login = async (loginInput: string, password: string) => {
    const res = await (api as any).auth?.login?.(loginInput, password) || {
      token: 'offline_demo_token',
      user: { id: 1, username: loginInput, is_offline: false },
    };
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('fury_auth_token', res.token);
    localStorage.setItem('fury_auth_user', JSON.stringify(res.user));
  };

  const register = async (data: { username?: string; email?: string; password: string }) => {
    const res = await (api as any).auth?.register?.(data) || {
      token: 'offline_demo_token',
      user: { id: 1, username: data.username || 'usuario', is_offline: false },
    };
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('fury_auth_token', res.token);
    localStorage.setItem('fury_auth_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(DEFAULT_OFFLINE_USER);
    localStorage.removeItem('fury_auth_token');
    localStorage.removeItem('fury_auth_user');
  };

  const isOnline = !!token && !user.is_offline;
  const isOffline = !isOnline;
  const isAuthenticated = true; // O usuário sempre pode navegar no app

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isOffline,
        isOnline,
        isLoading,
        login,
        register,
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

export default AuthContext;
