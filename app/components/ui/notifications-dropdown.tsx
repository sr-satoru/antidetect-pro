// SPDX-License-Identifier: MIT OR Apache-2.0
// Central de Notificações Modal do Star Multilogin

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  CheckCheck,
  Clock,
  X,
} from 'lucide-react';
import { serviceNotifications, NotificationItem } from '@/services/notifications/service.notifications';
import { wsService, NotificationData } from '@/services/ws/service.ws';

type TabType = 'unread' | 'all';

export const NotificationsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('unread');

  // Fechar com tecla Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = serviceNotifications.subscribe((items) => {
      setNotifications(items);
    });
    return unsubscribe;
  }, []);

  // Escuta notificações em tempo real disparadas pelo Rust Backend via Hub wsService centralizado
  useEffect(() => {
    const unsubscribe = wsService.subscribe<NotificationData>('notification', (data) => {
      if (!data) return;
      const { id, title, description, type, timestamp } = data;
      serviceNotifications.add({
        id,
        title,
        description,
        type: (type as any) || 'warning',
        timestamp: timestamp || Date.now(),
      });
    });

    return unsubscribe;
  }, []);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)}h`;
    return `Há ${Math.floor(diff / 86400)}d`;
  };

  const formatDateTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getTypeStyles = (type: NotificationItem['type']) => {
    switch (type) {
      case 'migration':
        return {
          label: 'Migração',
          badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          icon: <ShieldCheck size={16} className="text-purple-500 shrink-0" />,
        };
      case 'success':
        return {
          label: 'Sucesso',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
        };
      case 'warning':
        return {
          label: 'Aviso',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
        };
      case 'error':
        return {
          label: 'Erro',
          badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          icon: <AlertTriangle size={16} className="text-red-500 shrink-0" />,
        };
      default:
        return {
          label: 'Info',
          badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          icon: <Info size={16} className="text-blue-500 shrink-0" />,
        };
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'unread') return !notif.read;
    return true;
  });

  return (
    <>
      {/* Botão de Disparo no Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Notificações"
        className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-[#2D3039] bg-slate-50 hover:bg-slate-100 dark:bg-[#1F2026] dark:hover:bg-[#282A33] text-slate-600 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-[#7C3AED] text-[9.5px] font-black text-white absolute -top-1 -right-1 shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modal Clean & Moderno estilo Imagem de Referência */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] sm:pt-[12vh] p-4 sm:p-6 overflow-y-auto bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full max-w-[660px] h-[480px] max-h-[85vh] bg-white dark:bg-[#1E1E22] border border-slate-200 dark:border-[#2D3039] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-left select-none mb-12"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header com Abas Minimalistas e Botão Fechar */}
              <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-200 dark:border-[#2D3039] shrink-0">
              <div className="flex items-center gap-7">
                <button
                  type="button"
                  onClick={() => setActiveTab('unread')}
                  className={`relative pb-3 text-[14.5px] font-medium transition-colors cursor-pointer select-none ${
                    activeTab === 'unread'
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-[#D1D1D6]'
                  }`}
                >
                  Notificações não lidas
                  {activeTab === 'unread' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900 dark:bg-white rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`relative pb-3 text-[14.5px] font-medium transition-colors cursor-pointer select-none ${
                    activeTab === 'all'
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-[#D1D1D6]'
                  }`}
                >
                  Todas as notificações
                  {activeTab === 'all' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900 dark:bg-white rounded-full" />
                  )}
                </button>
              </div>

              {/* Lado Direito: Ações rápidas (quando existirem) + Botão de fechar */}
              <div className="flex items-center gap-2 pb-3">
                {notifications.length > 0 && (
                  <div className="flex items-center gap-1 mr-1 text-xs text-slate-400 dark:text-[#8E8E93]">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => serviceNotifications.markAllAsRead()}
                        className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 text-[12px]"
                        title="Marcar todas como lidas"
                      >
                        <CheckCheck size={14} />
                        <span className="hidden sm:inline">Marcar lidas</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => serviceNotifications.clearAll()}
                      className="hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Limpar todas as notificações"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-800 dark:text-[#8E8E93] dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  title="Fechar (ESC)"
                >
                  <X size={20} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Conteúdo Central: Lista ou Empty State */}
            {filteredNotifications.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6 select-none">
                <span className="text-[14px] text-slate-400 dark:text-[#71717A] font-normal tracking-wide">
                  Sem novas notificações
                </span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04] p-3 space-y-1 select-text [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] dark:[scrollbar-color:#3E404D_transparent]">
                {filteredNotifications.map((notif) => {
                  const style = getTypeStyles(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-xl transition-all border ${
                        !notif.read
                          ? 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 shadow-2xs'
                          : 'bg-transparent border-transparent hover:bg-slate-50/60 dark:hover:bg-white/[0.02] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${style.badge}`}>
                          {style.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-[13.5px] font-medium text-slate-900 dark:text-[#F1F1F4] truncate">
                              {notif.title}
                            </h4>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-slate-400 dark:text-[#8E8E93] flex items-center gap-1 font-mono">
                                <Clock size={11} />
                                {formatRelativeTime(notif.timestamp)}
                              </span>
                              {!notif.read && (
                                <span
                                  className="w-2 h-2 rounded-full bg-[#7C3AED] shadow-xs"
                                  title="Não lida"
                                />
                              )}
                            </div>
                          </div>

                          <p className="mt-1 text-xs text-slate-600 dark:text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">
                            {notif.description}
                          </p>

                          {notif.meta && Object.keys(notif.meta).length > 0 && (
                            <div className="mt-2 p-2 rounded bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-[#90909D] overflow-x-auto">
                              {JSON.stringify(notif.meta, null, 2)}
                            </div>
                          )}

                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 dark:text-[#76736D]">
                              {formatDateTime(notif.timestamp)}
                            </span>

                            <div className="flex items-center gap-3">
                              {!notif.read && (
                                <button
                                  type="button"
                                  onClick={() => serviceNotifications.markAsRead(notif.id)}
                                  className="text-[#7C3AED] hover:text-[#6D28D9] dark:text-[#A78BFA] dark:hover:text-[#C4B5FD] hover:underline font-medium cursor-pointer"
                                >
                                  Marcar como lida
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => serviceNotifications.remove(notif.id)}
                                className="text-slate-400 hover:text-red-500 dark:text-[#76736D] dark:hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                                title="Excluir notificação"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default NotificationsDropdown;
