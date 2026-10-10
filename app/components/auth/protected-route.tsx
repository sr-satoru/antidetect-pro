import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#08090C] text-slate-800 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-600 dark:text-[#00FF66]" />
          <span className="text-xs text-slate-500 dark:text-[#8E92A2]">Iniciando One Star Multilogin...</span>
        </div>
      </div>
    );
  }

  // Acesso liberado por padrão (Modo Offline nativo estilo Donut Browser)
  return <Outlet />;
};

export default ProtectedRoute;
