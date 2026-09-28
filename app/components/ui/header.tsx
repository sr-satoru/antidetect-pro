import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import {
  Download,
  ListTodo,
  Wifi,
  Bell,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { useBrowser } from '@/contexts/browser-context';

import { UpdateCenterDropdown } from '@/components/browser/update-center-dropdown';
import { NotificationsDropdown } from '@/components/ui/notifications-dropdown';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    <header className="relative h-14 bg-transparent px-4 sm:px-6 flex items-center justify-between shrink-0 z-40">
      {/* Title desenhado diretamente na página */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-[#F4F4F6] tracking-tight">
          {title || getAutoTitle()}
        </h1>
      </div>

      {/* Right Controls integrados diretamente no canvas */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Central de Atualizações / Gerenciador de Download do Motor Star Multlogin */}
        <UpdateCenterDropdown />

        {/* Central de Tarefas */}
        <button
          type="button"
          onClick={() => toast.info('Central de Tarefas: nenhuma tarefa pendente')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#15161D] hover:bg-[#1E2028] text-[#C8CBD4] hover:text-white text-xs font-medium border border-[#2B2D38] hover:border-[#3E404D] transition-colors cursor-pointer"
          title="Central de Tarefas"
        >
          <ListTodo size={14} />
          <span className="bg-[#242633] text-[#DFE104] text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
            0
          </span>
        </button>

        {/* Status de Rede & Notificações */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Status de Rede: Conectado"
            className="p-1.5 rounded-lg text-[#787C8A] hover:text-[#4ade80] hover:bg-[#15161D] transition-colors cursor-pointer"
          >
            <Wifi size={15} />
          </button>

          <NotificationsDropdown />
        </div>

        {/* Separador fino */}
        <div className="w-px h-4 bg-[#2B2D38] mx-1" />

        {/* User Profile Badge & Nuvem Controls */}
        <div className="flex items-center gap-2">
          {user?.is_offline ? (
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1C1D24] hover:bg-[#252834] text-white text-xs font-medium border border-white/20 hover:border-white transition-all cursor-pointer shadow-xs"
              title="Clique para sincronizar ou conectar à sua conta na Nuvem"
            >
              <span className="flex h-2 w-2 rounded-full bg-[#52C41A] animate-pulse" />
              <span className="text-white font-medium">⚡ Modo Offline</span>
              <span className="text-[10px] text-[#A5A8B6] ml-0.5">· Conectar Nuvem</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-[#15161D] px-2.5 py-1 select-none">
                <div className="w-6 h-6 rounded-full bg-[#DFE104]/15 border border-[#DFE104]/30 flex items-center justify-center text-xs font-bold text-[#DFE104]">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[12px] font-semibold text-white leading-tight">
                    @{user?.username}
                  </span>
                  <span className="text-[9.5px] text-[#52C41A] leading-tight font-medium">
                    ☁️ Sincronizado
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Desconectar da Nuvem"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#787C8A] transition-colors hover:bg-[#2B1B20] hover:text-[#FF6B6B]"
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
