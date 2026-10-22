// SPDX-License-Identifier: MIT OR Apache-2.0
// Central de Notificações Modal do Star Multilogin

import React, { useState, useEffect } from 'react';
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
  Filter,
} from 'lucide-react';
import { serviceNotifications, NotificationItem } from '@/services/notifications/service.notifications';
import { wsService, NotificationData } from '@/services/ws/service.ws';

type FilterTab = 'all' | 'unread' | 'warnings' | 'migrations';

export const NotificationsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

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
          pill: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
          icon: <ShieldCheck size={17} className="text-purple-600 dark:text-purple-400 shrink-0" />,
        };
      case 'success':
        return {
          label: 'Sucesso',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          pill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
          icon: <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />,
        };
      case 'warning':
        return {
          label: 'Aviso',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          pill: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
          icon: <AlertTriangle size={17} className="text-amber-600 dark:text-amber-400 shrink-0" />,
        };
      case 'error':
        return {
          label: 'Erro',
          badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          pill: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
          icon: <AlertTriangle size={17} className="text-red-600 dark:text-red-400 shrink-0" />,
        };
      default:
        return {
          label: 'Info',
          badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          pill: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
          icon: <Info size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />,
        };
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'unread') return !notif.read;
    if (activeTab === 'warnings') return notif.type === 'warning' || notif.type === 'error';
    if (activeTab === 'migrations') return notif.type === 'migration';
    return true;
  });

  return (
    <>
      {/* Botão de Disparo no Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Central de Notificações"
        className="relative flex items-center justify-center h-8.5 w-8.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 hover:bg-slate-100 dark:bg-[#15151A] dark:hover:bg-[#24242C] text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-emerald-500 text-[9.5px] font-black text-white absolute -top-1 -right-1 shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modal Pop-up Espaçoso e Detalhado */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#1A1A21] border border-slate-200 dark:border-[#2E2E38] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2E2E38] bg-slate-50/60 dark:bg-[#15151A]/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-[#2E2E38] flex items-center justify-center text-slate-700 dark:text-[#F1F1F4] shadow-inner">
                  <Bell size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-[#F1F1F4] tracking-tight">
                      Notificações do Sistema
                    </h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                        {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#90909D]">
                    Histórico detalhado de alertas, migrações e eventos do Star Multilogin
                  </p>
                </div>
              </div>

              {/* Botões de Ação Global do Header */}
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => serviceNotifications.markAllAsRead()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24242C] border border-slate-200 dark:border-[#2E2E38] transition-all cursor-pointer shadow-2xs"
                      title="Marcar todas as notificações como lidas"
                    >
                      <CheckCheck size={14} />
                      <span className="hidden sm:inline">Marcar lidas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => serviceNotifications.clearAll()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-600 dark:text-[#76736D] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer"
                      title="Limpar todo o histórico de notificações"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Limpar</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:text-[#76736D] dark:hover:text-[#F1F1F4] hover:bg-slate-100 dark:hover:bg-[#24242C] transition-all cursor-pointer"
                  title="Fechar modal (ESC)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-200 dark:border-[#2E2E38] bg-slate-50/30 dark:bg-[#15151A]/30 overflow-x-auto [scrollbar-width:none]">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                    : 'text-slate-600 dark:text-[#90909D] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                }`}
              >
                Todas
                <span className="text-[10px] opacity-75 font-mono">({notifications.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'unread'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                    : 'text-slate-600 dark:text-[#90909D] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                }`}
              >
                Não Lidas
                <span className="text-[10px] opacity-75 font-mono">({unreadCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('warnings')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'warnings'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                    : 'text-slate-600 dark:text-[#90909D] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                }`}
              >
                Avisos & Erros
                <span className="text-[10px] opacity-75 font-mono">
                  ({notifications.filter((n) => n.type === 'warning' || n.type === 'error').length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('migrations')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'migrations'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                    : 'text-slate-600 dark:text-[#90909D] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                }`}
              >
                Migrações
                <span className="text-[10px] opacity-75 font-mono">
                  ({notifications.filter((n) => n.type === 'migration').length})
                </span>
              </button>
            </div>

            {/* Corpo com Scroll e Cards Detalhados */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] dark:[scrollbar-color:#3E404D_transparent]">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#15151A] border border-slate-200 dark:border-[#2E2E38] flex items-center justify-center text-slate-400 dark:text-[#90909D] mb-3 shadow-inner">
                    <Bell size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                    Nenhuma notificação encontrada
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#90909D] mt-1 max-w-sm">
                    {activeTab === 'unread'
                      ? 'Você leu todas as notificações recentes.'
                      : 'Tudo em dia! Avisos operacionais, logs de sincronização e migrações aparecerão aqui com detalhes completos.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const style = getTypeStyles(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border transition-all ${
                        !notif.read
                          ? 'bg-slate-50/90 dark:bg-[#15151A] border-slate-300 dark:border-[#2E2E38] shadow-2xs'
                          : 'bg-white dark:bg-[#1E1E26]/60 border-slate-200 dark:border-white/5 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`p-2 rounded-xl border shrink-0 ${style.badge}`}>
                          {style.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.pill}`}
                              >
                                {style.label}
                              </span>
                              <h4 className="text-[13.5px] font-semibold text-slate-900 dark:text-[#F1F1F4] truncate">
                                {notif.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 dark:text-[#90909D]">
                                <Clock size={11} />
                                {formatRelativeTime(notif.timestamp)}
                              </span>
                              {!notif.read && (
                                <span
                                  className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"
                                  title="Não lida"
                                />
                              )}
                            </div>
                          </div>

                          {/* Descrição Completa Sem Truncamento */}
                          <div className="mt-2 text-[12.5px] text-slate-700 dark:text-[#C9C9D2] leading-relaxed whitespace-pre-wrap">
                            {notif.description}
                          </div>

                          {/* Metadados Adicionais (se existirem) */}
                          {notif.meta && Object.keys(notif.meta).length > 0 && (
                            <div className="mt-3 p-2.5 rounded-lg bg-slate-100 dark:bg-[#111116] border border-slate-200 dark:border-[#2E2E38] text-[11px] font-mono text-slate-600 dark:text-[#90909D] overflow-x-auto">
                              {JSON.stringify(notif.meta, null, 2)}
                            </div>
                          )}

                          {/* Rodapé do Card com Data/Hora e Ações Individuais */}
                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 dark:text-[#76736D]">
                              {formatDateTime(notif.timestamp)}
                            </span>

                            <div className="flex items-center gap-2">
                              {!notif.read && (
                                <button
                                  type="button"
                                  onClick={() => serviceNotifications.markAsRead(notif.id)}
                                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                                >
                                  Marcar lida
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => serviceNotifications.remove(notif.id)}
                                className="text-slate-400 hover:text-red-500 dark:text-[#76736D] dark:hover:text-red-400 transition-colors p-1 cursor-pointer"
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
                })
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-[#2E2E38] bg-slate-50/60 dark:bg-[#15151A]/60 text-xs text-slate-500 dark:text-[#90909D]">
              <span className="font-mono">
                {notifications.length} {notifications.length === 1 ? 'notificação' : 'notificações'} no total
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationsDropdown;
