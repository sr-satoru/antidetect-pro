import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import {
  Download,
  Wifi,
  Cloud,
  CloudOff,
  Bell,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { serviceSync } from '@/services/sync/service.sync';

import { UpdateCenterDropdown } from '@/components/browser/update-center-dropdown';
import { NotificationsDropdown } from '@/components/ui/notifications-dropdown';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [cloudOnline, setCloudOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await serviceSync.checkHealth();
        if (isMounted) {
          setCloudOnline(res.cloud_online);
        }
      } catch {
        if (isMounted) {
          setCloudOnline(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getAutoTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/perfis/editar')) return 'Editar Perfil';
    if (path.startsWith('/perfis')) return 'Perfis de Navegação';
    if (path.startsWith('/criar-perfil')) return 'Criar Novo Perfil';
    if (path.startsWith('/proxy')) return 'Gerenciador de Proxies';
    if (path.startsWith('/grupos')) return 'Grupos de Perfis';
    if (path.startsWith('/configuration')) return 'Configurações Globais';
    return 'Painel de Controle';
  };

  return (
    <header className="relative h-14 bg-transparent px-4 sm:px-6 flex items-center justify-between shrink-0 z-40 transition-colors">
      {/* Title desenhado diretamente na página */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-900 dark:text-[#F4F4F6] tracking-tight">
          {title || getAutoTitle()}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Central de Atualizações / Gerenciador de Download do Motor Star Multlogin */}
        <UpdateCenterDropdown />

        {/* Alternador de Tema: Day Mode ☀️ / Dark Mode 🌙 */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#15161D] dark:hover:bg-[#1E2028] text-amber-500 dark:text-amber-300 border border-slate-200 dark:border-[#2B2D38] transition-all cursor-pointer shadow-xs"
          title={theme === 'dark' ? 'Mudar para Modo Claro (Day Mode)' : 'Mudar para Modo Escuro (Dark Mode)'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Status de Rede & Nuvem */}
        <div className="flex items-center gap-1.5">
          {cloudOnline === true ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium select-none shadow-2xs"
              title="Servidor de Nuvem Conectado e Operacional"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <Cloud size={13} />
              <span className="hidden sm:inline text-[11px] font-mono">Nuvem Online</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium select-none shadow-2xs"
              title="Nuvem offline ou inacessível no momento. Perfis operando normalmente em modo local seguro."
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
              <CloudOff size={13} />
              <span className="hidden sm:inline text-[11px] font-mono">Nuvem Offline</span>
            </div>
          )}

          <NotificationsDropdown />
        </div>

        {/* Separador fino */}
        <div className="w-px h-4 bg-slate-200 dark:bg-[#2B2D38] mx-1" />

        {/* User Profile Badge & Nuvem Controls */}
        <div className="flex items-center gap-2">
          {user?.is_offline ? (
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C1D24] hover:bg-slate-100 dark:hover:bg-[#252834] text-slate-800 dark:text-white text-xs font-medium border border-slate-200 dark:border-white/20 transition-all cursor-pointer shadow-xs"
              title="Clique para sincronizar ou conectar à sua conta na Nuvem"
            >
              <span className="flex h-2 w-2 rounded-full bg-amber-400" />
              <span className="font-medium">⚡ Modo Offline</span>
              <span className="text-[10px] text-slate-500 dark:text-[#A5A8B6] ml-0.5">· Conectar Nuvem</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-[#15161D] px-2.5 py-1 select-none shadow-xs">
                <div className="w-6 h-6 rounded-full bg-[#FF334B]/15 border border-[#FF334B]/30 flex items-center justify-center text-xs font-bold text-[#FF334B]">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[12px] font-semibold text-slate-900 dark:text-white leading-tight">
                    {user?.email || `@${user?.username}`}
                  </span>
                  <span className="text-[9.5px] text-emerald-600 dark:text-[#52C41A] leading-tight font-medium">
                    {cloudOnline ? '☁️ Sincronizado' : '⚡ Local (Conectado)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Desconectar da Nuvem"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 dark:text-[#787C8A] transition-colors hover:bg-red-50 dark:hover:bg-[#2B1B20] hover:text-red-500 dark:hover:text-[#FF6B6B]"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
