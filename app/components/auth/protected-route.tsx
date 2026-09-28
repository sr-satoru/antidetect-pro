import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#08090C] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#DFE104]" />
          <span className="text-xs text-[#8E92A2]">Iniciando One Star Multilogin...</span>
        </div>
      </div>
    );
  }

  // Acesso liberado por padrão (Modo Offline nativo estilo Donut Browser)
  return <Outlet />;
};

export default ProtectedRoute;
