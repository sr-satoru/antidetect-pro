import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import {
  Cloud,
  LogOut,
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
    if (path.startsWith('/extensoes')) return 'Extensões do Navegador';
    if (path.startsWith('/lixeira')) return 'Lixeira de Perfis';
    if (path.startsWith('/sincronizador')) return 'Sincronizador Multilogin';
    if (path.startsWith('/api-mcp')) return 'API & Protocolo MCP';
    if (path.startsWith('/membros')) return 'Gerenciamento de Equipe';
    if (path.startsWith('/logs')) return 'Auditoria & Logs';
    if (path.startsWith('/configuration')) return 'Configurações Globais';
    return 'Painel de Controle';
  };

  return (
    <header className="relative h-[60px] bg-white dark:bg-[#1A1A21] border-b border-slate-200 dark:border-[#2E2E38] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 transition-colors shadow-2xs">
      {/* Title e indicador de contexto */}
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-[#F1F1F4] tracking-tight">
          {title || getAutoTitle()}
        </h1>
        {location.pathname.startsWith('/perfis') && (
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#15151A] text-slate-500 dark:text-[#90909D] border border-slate-200 dark:border-[#2E2E38]/80 tabular-nums">
            Painel Principal
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Central de Atualizações / Gerenciador de Download do Motor Star Multilogin */}
        <UpdateCenterDropdown />

        {/* Alternador de Tema: Day Mode ☀️ / Dark Mode 🌙 */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center h-8.5 w-8.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#15151A] dark:hover:bg-[#24242C] text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2E2E38] transition-all cursor-pointer shadow-2xs"
          title={theme === 'dark' ? 'Mudar para Modo Claro (Day Mode)' : 'Mudar para Modo Escuro (Dark Mode)'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Status de Rede & Nuvem se estiver conectada */}
        {cloudOnline === true && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium select-none shadow-2xs"
            title="Servidor de Nuvem Conectado e Operacional"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <Cloud size={13} />
            <span className="hidden sm:inline text-[11px] font-mono">Nuvem Online</span>
          </div>
        )}

        {/* Notificações */}
        <NotificationsDropdown />

        {/* Separador sutil */}
        <div className="w-px h-5 bg-slate-200 dark:bg-[#2E2E38] mx-1" />

        {/* Account Button Estilo AliasMode (.account-button) */}
        {!user?.is_offline && user?.email ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] hover:bg-slate-100/80 dark:hover:bg-[#24242C] pl-1 pr-3 py-1 select-none shadow-2xs transition-all">
              <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-semibold text-slate-900 dark:text-[#F1F1F4] leading-tight truncate max-w-[130px]">
                  {user?.email || `@${user?.username}`}
                </span>
                <span className="text-[9.5px] text-emerald-600 dark:text-[#52C41A] leading-tight font-medium">
                  {cloudOnline ? '☁️ Sincronizado' : '⚡ Conectado'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Desconectar da Nuvem"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 dark:text-[#787C8A] transition-colors hover:bg-red-50 dark:hover:bg-[#2B1B20] hover:text-red-500 dark:hover:text-[#FF6B6B] border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] select-none shadow-2xs text-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
            <span className="font-medium text-[11.5px] text-slate-700 dark:text-[#C9C9D2]">Modo Local Seguro</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
