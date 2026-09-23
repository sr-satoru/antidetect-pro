import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Layers,
  Folder,
  Globe,
  Puzzle,
  Trash2,
  Bot,
  Repeat,
  Cpu,
  Code,
  Users,
  FileText,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative ${
      isActive
        ? 'bg-[#181a22] text-[#DFE104] font-semibold shadow-xs'
        : 'text-[#9093A2] hover:bg-[#14161e] hover:text-[#F4F4F6]'
    } ${isCollapsed ? 'justify-center px-2' : ''}`;

  return (
    <aside
      className={`h-screen bg-[#0d0e13] border-r border-[#1c1e27] flex flex-col transition-all duration-200 select-none z-30 shrink-0 ${
        isCollapsed ? 'w-[68px]' : 'w-[230px]'
      }`}
    >
      {/* Header / Brand */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#1c1e27]">
        <NavLink
          to="/perfis"
          className={`flex items-center gap-2.5 overflow-hidden transition-opacity ${
            isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}
        >
          <div className="w-7 h-7 rounded-md bg-[#DFE104] text-black font-black flex items-center justify-center text-sm shadow-[0_0_12px_rgba(223,225,4,0.3)]">
            S
          </div>
          <span className="font-bold text-[15px] tracking-tight text-[#F4F4F6]">
            Syncro
          </span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md text-[#5E6172] hover:text-[#F4F4F6] hover:bg-[#191b24] transition-colors"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Action Button: Novo Perfil */}
      <div className="p-3">
        <button
          type="button"
          onClick={handleNewProfile}
          className={`w-full flex items-center justify-center gap-2 bg-[#DFE104] hover:bg-[#C5C702] text-black font-semibold text-[13px] rounded-lg transition-all shadow-[0_2px_10px_rgba(223,225,4,0.15)] active:scale-[0.98] ${
            isCollapsed ? 'h-9 px-0' : 'h-9 px-3'
          }`}
          title="Criar Novo Perfil"
        >
          <Plus size={16} strokeWidth={2.5} />
          {!isCollapsed && <span>Novo Perfil</span>}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-4">
        {/* Main Section */}
        <div className="space-y-1">
          <NavLink to="/perfis" className={navItemClass} title="Perfis">
            <Layers size={17} className="shrink-0" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="truncate">Perfis</span>
                <span className="bg-[#1e202c] text-[#8e92a4] text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                  7
                </span>
              </div>
            )}
          </NavLink>

          <NavLink to="/grupos" className={navItemClass} title="Grupos">
            <Folder size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Grupos</span>}
          </NavLink>

          <NavLink to="/proxy" className={navItemClass} title="Proxies">
            <Globe size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Proxies</span>}
          </NavLink>

          <NavLink to="/extensoes" className={navItemClass} title="Extensões">
            <Puzzle size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Extensões</span>}
          </NavLink>

          <NavLink to="/lixeira" className={navItemClass} title="Lixeira">
            <Trash2 size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Lixeira</span>}
          </NavLink>
        </div>

        {/* Automação Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#4f5366]">
              Automação
            </div>
          )}

          <NavLink to="/ai-agent" className={navItemClass} title="AI Agent">
            <Bot size={17} className="shrink-0" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="truncate">AI Agent</span>
                <span className="bg-[#DFE104]/15 text-[#DFE104] text-[10px] font-bold px-1.5 py-0.2 rounded">
                  Novo
                </span>
              </div>
            )}
          </NavLink>

          <NavLink to="/sincronizador" className={navItemClass} title="Sincronizador">
            <Repeat size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Sincronizador</span>}
          </NavLink>

          <NavLink to="/rpa-plus" className={navItemClass} title="RPA Plus">
            <Cpu size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">RPA Plus</span>}
          </NavLink>

          <NavLink to="/api-mcp" className={navItemClass} title="API & MCP">
            <Code size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">API & MCP</span>}
          </NavLink>
        </div>

        {/* Gerenciamento Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#4f5366]">
              Gerenciamento
            </div>
          )}

          <NavLink to="/membros" className={navItemClass} title="Membros">
            <Users size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Membros</span>}
          </NavLink>

          <NavLink to="/logs" className={navItemClass} title="Logs de Ações">
            <FileText size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Logs de Ações</span>}
          </NavLink>

          <NavLink to="/configuration" className={navItemClass} title="Configurações">
            <Settings size={17} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Configurações</span>}
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
