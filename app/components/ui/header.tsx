import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import {
  Download,
  ListTodo,
  Upload,
  Wifi,
  Bell,
  Zap,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getAutoTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path.startsWith('/perfis')) return 'Perfis de Navegação';
    if (path.startsWith('/criar-perfil')) return 'Criar Novo Perfil';
    if (path.startsWith('/proxy')) return 'Gerenciador de Proxies';
    if (path.startsWith('/grupos')) return 'Grupos de Perfis';
    if (path.startsWith('/configuration')) return 'Configurações Globais';
    return 'Painel de Controle';
  };

  return (
    <header className="h-14 bg-transparent px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
      {/* Title desenhado diretamente na página */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-[#F4F4F6] tracking-tight">
          {getAutoTitle()}
        </h1>
      </div>

      {/* Right Controls integrados diretamente no canvas */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Baixar Cliente */}
        <button
          type="button"
          onClick={() => alert('Download do Cliente Desktop')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15161D] hover:bg-[#1E2028] text-[#C8CBD4] hover:text-white text-xs font-medium border border-[#2B2D38] hover:border-[#3E404D] transition-colors cursor-pointer"
        >
          <Download size={13} />
          <span>Baixar Cliente</span>
        </button>

        {/* Central de Tarefas */}
        <button
          type="button"
          onClick={() => alert('Central de Tarefas')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#15161D] hover:bg-[#1E2028] text-[#C8CBD4] hover:text-white text-xs font-medium border border-[#2B2D38] hover:border-[#3E404D] transition-colors cursor-pointer"
          title="Central de Tarefas"
        >
          <ListTodo size={14} />
          <span className="bg-[#242633] text-[#DFE104] text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
            0
          </span>
        </button>

        {/* Importar / Exportar */}
        <div className="hidden md:flex items-center bg-[#15161D] border border-[#2B2D38] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => alert('Importar Perfis')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-[#9093A2] hover:text-white hover:bg-[#1E2028] transition-colors cursor-pointer"
          >
            <Upload size={12} />
            <span>Importar</span>
          </button>
          <div className="w-px h-3.5 bg-[#2B2D38]" />
          <button
            type="button"
            onClick={() => alert('Exportar Perfis')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-[#9093A2] hover:text-white hover:bg-[#1E2028] transition-colors cursor-pointer"
          >
            <Download size={12} />
            <span>Exportar</span>
          </button>
        </div>

        {/* Status de Rede & Notificações */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Status de Rede: Conectado"
            className="p-1.5 rounded-lg text-[#787C8A] hover:text-[#4ade80] hover:bg-[#15161D] transition-colors cursor-pointer"
          >
            <Wifi size={15} />
          </button>

          <button
            type="button"
            title="Notificações"
            className="p-1.5 rounded-lg text-[#787C8A] hover:text-white hover:bg-[#15161D] transition-colors relative cursor-pointer"
          >
            <Bell size={15} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#DFE104] absolute top-1.5 right-1.5" />
          </button>
        </div>

        {/* Separador fino */}
        <div className="w-px h-4 bg-[#2B2D38] mx-1" />

        {/* User Profile Badge & Logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#2B2D38] bg-[#15161D] px-2.5 py-1 select-none">
            <div className="w-6 h-6 rounded-full bg-[#1F222D] border border-[#323647] flex items-center justify-center text-xs font-bold text-[#1677FF]">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[12px] font-semibold text-[#F4F4F6] leading-tight">
                @{user?.username || 'usuario'}
              </span>
              <span className="text-[9.5px] text-[#52C41A] leading-tight font-medium">
                {user?.is_offline ? '⚡ Modo Offline (Sem E-mail)' : '☁️ Nuvem'}
              </span>
            </div>
          </div>

          {/* Botão Sair / Trocar Usuário */}
          <button
            type="button"
            onClick={logout}
            title="Sair / Trocar de Usuário"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#787C8A] transition-colors hover:bg-[#2B1B20] hover:text-[#FF6B6B]"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
