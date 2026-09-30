// SPDX-License-Identifier: MIT OR Apache-2.0
// Central de Notificações Popover do Star Multlogin

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { serviceNotifications, NotificationItem } from '@/services/notifications/service.notifications';

export const NotificationsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = serviceNotifications.subscribe((items) => {
      setNotifications(items);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpen = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen && unreadCount > 0) {
      // Opcional: marca como lidas ao abrir
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)}h`;
    return `Há ${Math.floor(diff / 86400)}d`;
  };

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'migration':
        return <ShieldCheck size={16} className="text-[#00FF66] shrink-0" />;
      case 'success':
        return <CheckCircle2 size={16} className="text-[#00FF66] shrink-0" />;
      case 'warning':
      case 'error':
        return <AlertTriangle size={16} className="text-[#f87171] shrink-0" />;
      default:
        return <Info size={16} className="text-[#60a5fa] shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão de Notificações com Badge */}
      <button
        type="button"
        onClick={handleOpen}
        title="Notificações"
        className={`p-1.5 rounded-lg transition-all relative cursor-pointer ${
          isOpen
            ? 'bg-[#1E2028] text-white shadow-xs'
            : 'text-[#787C8A] hover:text-white hover:bg-[#15161D]'
        }`}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-[#00FF66] text-[9px] font-black text-black absolute -top-1 -right-1 shadow-md shadow-[#00FF66]/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-[#2B2D38] bg-[#181920]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden flex flex-col text-left animate-in fade-in zoom-in-95 duration-150">
          {/* Header do Dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B2D38] bg-[#15161D]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">Notificações</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#00FF66]/15 border border-[#00FF66]/30 text-[#00FF66] text-[10px] font-bold">
                  {unreadCount} novas
                </span>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => serviceNotifications.markAllAsRead()}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#A5A8B6] hover:text-white hover:bg-[#252834] transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={13} />
                  <span>Ler todas</span>
                </button>
                <button
                  type="button"
                  onClick={() => serviceNotifications.clearAll()}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#787C8A] hover:text-[#f87171] hover:bg-[#2B1B20] transition-colors"
                  title="Limpar todas as notificações"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Lista de Notificações com Scroll */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#232530] [scrollbar-width:thin] [scrollbar-color:#3E404D_transparent]">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#20222C] border border-[#2B2D38] flex items-center justify-center text-[#787C8A] mb-2.5">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-medium text-white">Tudo em dia!</p>
                <p className="text-[11px] text-[#787C8A] mt-0.5">
                  Nenhuma notificação ou aviso recente.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => serviceNotifications.markAsRead(notif.id)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-[#1E2028] ${
                    !notif.read ? 'bg-[#15161D]/70' : 'bg-transparent'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-[#242633] border border-[#2E3142]">
                    {renderIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-semibold text-white truncate">
                        {notif.title}
                      </p>
                      <span className="flex items-center gap-1 text-[10px] text-[#787C8A] shrink-0 font-mono">
                        <Clock size={10} />
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#C8CBD4] mt-0.5 leading-relaxed line-clamp-2">
                      {notif.description}
                    </p>
                  </div>

                  {!notif.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] shrink-0 mt-2 shadow-xs shadow-[#00FF66]/50" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
