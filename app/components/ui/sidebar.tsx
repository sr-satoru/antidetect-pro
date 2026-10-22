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
      ? 'bg-[#238636]/15 text-[#3fb950] dark:bg-[#238636]/20 dark:text-[#3fb950] font-semibold shadow-2xs'
      : 'text-slate-600 hover:bg-[#F3F2EF] hover:text-[#1B1A18] dark:text-[#848D97] dark:hover:bg-[#21262D] dark:hover:text-[#E6EDF3]'
    } ${isCollapsed ? 'justify-center px-2' : ''}`;

  return (
    <aside
      className={`relative h-screen bg-white dark:bg-[#161B22] border-r border-slate-200 dark:border-[#30363D] flex flex-col transition-all duration-200 select-none z-30 shrink-0 ${isCollapsed ? 'w-[64px]' : 'w-[230px]'
        }`}
    >
      {/* Botão Flutuante de Recolher/Expandir */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute top-[14px] -right-[16px] z-50 flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 dark:border-[#30363D] bg-white dark:bg-[#21262D] text-slate-700 dark:text-[#E6EDF3] hover:text-[#238636] dark:hover:text-[#3fb950] hover:border-[#238636] dark:hover:border-[#3fb950] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shadow-[0_2px_6px_rgba(0,0,0,0.14)] dark:shadow-[0_3px_12px_rgba(0,0,0,0.6)] transition-all duration-150 cursor-pointer hover:scale-110 active:scale-95"
        title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isCollapsed ? (
          <ChevronRight size={16} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={16} strokeWidth={2.5} />
        )}
      </button>

      {/* Header / Brand */}
      <div
        className={`h-[60px] flex items-center border-b border-slate-200 dark:border-[#30363D] shrink-0 transition-all ${isCollapsed ? 'justify-center px-2' : 'px-4'
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
          className={`w-full flex cursor-pointer items-center justify-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-[13px] rounded-xl transition-all shadow-xs active:scale-[0.98] ${isCollapsed ? 'h-9 px-0' : 'h-9 px-3.5'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Layers
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-white'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Globe
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Puzzle
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Trash2
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Repeat
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Code
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Users
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <FileText
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                )}
                <Settings
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#76736D] group-hover:text-slate-900 dark:group-hover:text-[#F1F1F4]'
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
