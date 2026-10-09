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
import { FirefoxIcon } from './firefox-icon';

interface SidebarProps {
  onNewProfileClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewProfileClick }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNewProfile = () => {
    if (onNewProfileClick) {
      onNewProfileClick();
    } else {
      navigate('/criar-perfil');
    }
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group relative select-none ${isActive
      ? 'bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white font-semibold shadow-xs'
      : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 dark:text-[#8E92A2] dark:hover:bg-white/[0.04] dark:hover:text-white'
    } ${isCollapsed ? 'justify-center px-2' : ''}`;

  return (
    <aside
      className={`h-screen bg-white dark:bg-[#0E0F14] border-r border-slate-200 dark:border-white/10 flex flex-col transition-all duration-200 select-none z-30 shrink-0 ${isCollapsed ? 'w-[68px]' : 'w-[230px]'
        }`}
    >
      {/* Header / Brand */}
      <div
        className={`h-14 flex items-center border-b border-slate-200 dark:border-white/10 shrink-0 transition-all ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
          }`}
      >
        {!isCollapsed ? (
          <>
            <NavLink
              to="/perfis"
              className="flex items-center gap-2.5 overflow-hidden transition-all group min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-inner">
                <FirefoxIcon size={20} />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-bold text-[14px] tracking-tight text-slate-900 dark:text-white truncate">
                  Super Star
                </span>
                <span className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-400 dark:text-[#7C8092] truncate">
                  Multilogin
                </span>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/90 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/15 hover:border-slate-300 dark:hover:border-white/25 transition-all shadow-2xs"
              title="Recolher menu"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-all shadow-xs"
            title="Expandir menu"
          >
            <ChevronRight size={17} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Action Button: Novo Perfil */}
      <div className="p-3 shrink-0">
        <button
          type="button"
          onClick={handleNewProfile}
          className={`w-full flex cursor-pointer items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black font-bold text-[12.5px] rounded-xl transition-all shadow-xs active:scale-[0.98] ${isCollapsed ? 'h-9 px-0' : 'h-9 px-3.5'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Layers
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Globe
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Puzzle
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Trash2
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
            <div className="px-3 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#686C7E]">
              Automação
            </div>
          )}

          <NavLink to="/sincronizador" className={navItemClass} title="Sincronizador">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Repeat
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Code
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
            <div className="px-3 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#686C7E]">
              Gerenciamento
            </div>
          )}

          <NavLink to="/membros" className={navItemClass} title="Membros">
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Users
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <FileText
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500 dark:bg-[#00FF66]" />
                )}
                <Settings
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#8E92A2] group-hover:text-slate-900 dark:group-hover:text-white'
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
