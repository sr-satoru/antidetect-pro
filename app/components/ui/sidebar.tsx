import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Layers,
  Globe,
  Puzzle,
  Trash2,
  Repeat,
  Code,
  Users,
  FileText,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AstroFoxIcon } from '../icons';

interface SidebarProps {
  onNewProfileClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewProfileClick }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('star_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('star_sidebar_collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const handleNewProfile = () => {
    if (onNewProfileClick) {
      onNewProfileClick();
    } else {
      navigate('/criar-perfil');
    }
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group relative select-none ${isActive
      ? 'bg-[#EEF3FF] text-[#284A9E] dark:bg-[#151F38] dark:text-[#B3C6F8] font-semibold shadow-2xs'
      : 'text-slate-600 hover:bg-[#F3F2EF] hover:text-[#1B1A18] dark:text-[#90909D] dark:hover:bg-[#24242C] dark:hover:text-[#F1F1F4]'
    } ${isCollapsed ? 'justify-center px-2' : ''}`;

  return (
    <aside
      className={`relative h-screen bg-white dark:bg-[#1A1A21] border-r border-slate-200 dark:border-[#2E2E38] flex flex-col transition-all duration-200 select-none z-30 shrink-0 ${isCollapsed ? 'w-[64px]' : 'w-[230px]'
        }`}
    >
      {/* Botão Flutuante de Recolher/Expandir estilo AliasMode (rail-toggle na borda) */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute top-[19px] -right-[11px] z-50 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#E6E3DD] dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] text-[#76736D] dark:text-[#90909D] hover:text-[#3366E6] dark:hover:text-[#5E88F0] hover:border-[#C5D6FB] dark:hover:border-[#2B3F6E] hover:bg-[#EEF3FF] dark:hover:bg-[#151F38] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-all cursor-pointer hover:scale-110 active:scale-95"
        title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isCollapsed ? (
          <ChevronRight size={12} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={12} strokeWidth={2.5} />
        )}
      </button>

      {/* Header / Brand */}
      <div
        className={`h-[60px] flex items-center border-b border-slate-200 dark:border-[#2E2E38] shrink-0 transition-all ${isCollapsed ? 'justify-center px-2' : 'px-4'
          }`}
      >
        {!isCollapsed ? (
          <NavLink
            to="/perfis"
            className="flex items-center gap-2.5 overflow-hidden transition-all group min-w-0 w-full"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-inner">
              <AstroFoxIcon size={20} />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-[14px] tracking-tight text-slate-900 dark:text-[#F1F1F4] truncate">
                Super Star
              </span>
              <span className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-400 dark:text-[#7C8092] truncate">
                Multilogin
              </span>
            </div>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#15151A] text-slate-400 dark:text-[#7C8092] border border-slate-200/60 dark:border-[#2E2E38]">
              v2.0
            </span>
          </NavLink>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white flex items-center justify-center shrink-0 shadow-inner">
            <AstroFoxIcon size={20} />
          </div>
        )}
      </div>

      {/* Action Button: Novo Perfil */}
      <div className="p-3 shrink-0">
        <button
          type="button"
          onClick={handleNewProfile}
          className={`w-full flex cursor-pointer items-center justify-center gap-2 bg-[#3366E6] hover:bg-[#2A58CF] text-white font-semibold text-[13px] rounded-xl transition-all shadow-xs active:scale-[0.98] ${isCollapsed ? 'h-9 px-0' : 'h-9 px-3.5'
            }`}
          title="Criar Novo Perfil"
        >
          <Plus size={16} strokeWidth={2.5} />
          {!isCollapsed && <span>Novo Perfil</span>}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-1 space-y-4 [scrollbar-width:none]">
        {/* Main Section */}
        <div className="space-y-1">
          <NavLink to="/perfis" className={navItemClass} title="Perfis">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Layers
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-white'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Perfis</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/proxy" className={navItemClass} title="Proxies">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Globe
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Proxies</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/extensoes" className={navItemClass} title="Extensões">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Puzzle
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Extensões</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/lixeira" className={navItemClass} title="Lixeira">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Trash2
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Lixeira</span>}
              </>
            )}
          </NavLink>
        </div>

        {/* Automação Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#66666F]">
              Automação
            </div>
          )}

          <NavLink to="/sincronizador" className={navItemClass} title="Sincronizador">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Repeat
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Sincronizador</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/api-mcp" className={navItemClass} title="API & MCP">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Code
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">API & MCP</span>}
              </>
            )}
          </NavLink>
        </div>

        {/* Gerenciamento Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#66666F]">
              Gerenciamento
            </div>
          )}

          <NavLink to="/membros" className={navItemClass} title="Membros">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Users
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Membros</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/logs" className={navItemClass} title="Logs de Ações">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <FileText
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Logs de Ações</span>}
              </>
            )}
          </NavLink>

          <NavLink to="/configuration" className={navItemClass} title="Configurações">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3366E6] dark:bg-[#5E88F0]" />
                )}
                <Settings
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#3366E6] dark:text-[#5E88F0]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
                    }`}
                />
                {!isCollapsed && <span className="truncate">Configurações</span>}
              </>
            )}
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
