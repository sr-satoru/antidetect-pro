import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import {
  Cloud,
  LogOut,
  Sun,
  Moon,
  User,
  ChevronRight,
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
    if (path.startsWith('/configuration') || path.startsWith('/configuracoes')) return 'Configurações Globais';
    return 'Painel de Controle';
  };

  return (
    <header className="relative h-[60px] bg-white dark:bg-[#161B22] border-b border-slate-200 dark:border-[#30363D] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 transition-colors shadow-2xs">
      {/* Title e indicador de contexto */}
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-[#E6EDF3] tracking-tight">
          {title || getAutoTitle()}
        </h1>
        {location.pathname.startsWith('/perfis') && (
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#21262D] text-slate-500 dark:text-[#848D97] border border-slate-200 dark:border-[#30363D] tabular-nums">
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
          className="flex items-center justify-center h-8.5 w-8.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#21262D] dark:hover:bg-[#30363D] text-slate-600 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] border border-slate-200 dark:border-[#30363D] transition-all cursor-pointer shadow-2xs"
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

        {/* Botão de Conta estilo AliasMode (.account-button) que direciona para Configurações */}
        <button
          type="button"
          onClick={() => navigate('/configuration')}
          title="Abrir Conta & Configurações"
          aria-label="Abrir Conta e Configurações"
          className={`group flex items-center gap-2.5 h-[38px] max-w-[230px] pl-1.5 pr-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer text-left select-none active:scale-[0.98] shadow-2xs ${
            location.pathname === '/configuration' || location.pathname === '/configuracoes'
              ? 'border-[#7C3AED] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/15 dark:border-[#A78BFA] ring-2 ring-[#7C3AED]/20'
              : 'border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] hover:bg-slate-100 dark:hover:bg-[#24242C] hover:border-slate-300 dark:hover:border-[#3E4150]'
          }`}
        >
          {/* Avatar com gradiente violeta harmonizado */}
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs font-bold text-xs transition-transform group-hover:scale-105 bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA]">
            {!user?.is_offline && user?.email ? (
              user?.username ? user.username.charAt(0).toUpperCase() : 'U'
            ) : (
              <User size={14} className="text-white" />
            )}
          </div>

          {/* Dados da identidade (who) */}
          <div className="flex flex-col min-w-0 leading-tight">
            <b className="text-[12px] font-semibold text-slate-900 dark:text-[#F1F1F4] truncate max-w-[125px]">
              {!user?.is_offline && user?.email ? user.email : 'Workspace Local'}
            </b>
            <span className="text-[10px] text-slate-500 dark:text-[#90909D] truncate flex items-center gap-1">
              {!user?.is_offline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{user?.plan ? `${user.plan.toUpperCase()} · Nuvem` : (cloudOnline ? '☁️ Sincronizado' : '⚡ Conectado')}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-[#66666F] shrink-0" />
                  <span>Modo Local Seguro</span>
                </>
              )}
            </span>
          </div>

          {/* Seta Chevron Right para indicar navegação */}
          <ChevronRight
            size={14}
            className="ml-auto text-slate-400 dark:text-[#76736D] group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0"
          />
        </button>
      </div>
    </header>
  );
};

export default Header;
