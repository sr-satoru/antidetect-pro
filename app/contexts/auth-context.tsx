import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/api';

export interface UserSession {
  id: number;
  username: string;
  email?: string;
  is_offline: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  isOffline: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { username?: string; email?: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializa a sessão a partir do localStorage
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
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (loginInput: string, password: string) => {
    const res = await api.auth.login(loginInput, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('fury_auth_token', res.token);
    localStorage.setItem('fury_auth_user', JSON.stringify(res.user));
  };

  const register = async (data: { username?: string; email?: string; password: string }) => {
    const res = await api.auth.register(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('fury_auth_token', res.token);
    localStorage.setItem('fury_auth_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fury_auth_token');
    localStorage.removeItem('fury_auth_user');
  };

  const isAuthenticated = !!token && !!user;
  const isOffline = user?.is_offline ?? true;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isOffline,
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
