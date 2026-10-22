import React from 'react';
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
  type ExternalToast,
  type ToasterProps as SonnerToasterProps,
} from 'sonner';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Bell,
} from 'lucide-react';

export type NotificationType =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'loading'
  | 'default';

export interface NotificationAction {
  label: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationOptions
  extends Omit<ExternalToast, 'action' | 'cancel' | 'description'> {
  description?: React.ReactNode;
  action?: NotificationAction;
  cancel?: NotificationAction;
  icon?: React.ReactNode;
  id?: string | number;
  duration?: number;
}

export interface NotificationCardProps {
  id: string | number;
  type: NotificationType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: NotificationAction;
  cancel?: NotificationAction;
  icon?: React.ReactNode;
  onClose: () => void;
}

/**
 * Visual Notification Card
 * Projetado para seguir o design system Cyberpunk / Dark Mode do Antidetect Pro.
 */
export const NotificationCard: React.FC<NotificationCardProps> = ({
  id,
  type,
  title,
  description,
  action,
  cancel,
  icon,
  onClose,
}) => {
  const typeConfig = {
    success: {
      cardBg:
        'bg-slate-900 dark:bg-[#1A1A21] border border-emerald-500/40 text-white shadow-xl',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      defaultIcon: <CheckCircle2 size={16} strokeWidth={2.5} className="text-emerald-400" />,
    },
    info: {
      cardBg:
        'bg-slate-900 dark:bg-[#1A1A21] border border-sky-500/40 text-white shadow-xl',
      iconBg: 'bg-sky-500/20 text-sky-400',
      defaultIcon: <Info size={16} strokeWidth={2.5} className="text-sky-400" />,
    },
    warning: {
      cardBg:
        'bg-slate-900 dark:bg-[#1A1A21] border border-amber-500/40 text-white shadow-xl',
      iconBg: 'bg-amber-500/20 text-amber-400',
      defaultIcon: <AlertTriangle size={16} strokeWidth={2.5} className="text-amber-400" />,
    },
    error: {
      cardBg:
        'bg-slate-900 dark:bg-[#1A1A21] border border-rose-500/40 text-white shadow-xl',
      iconBg: 'bg-rose-500/20 text-rose-400',
      defaultIcon: <AlertCircle size={16} strokeWidth={2.5} className="text-rose-400" />,
    },
    loading: {
      cardBg:
        'bg-slate-900 dark:bg-[#1A1A21] border border-[#7C3AED]/40 text-white shadow-xl',
      iconBg: 'bg-[#7C3AED]/20 text-[#A78BFA]',
      defaultIcon: <Loader2 size={16} className="animate-spin text-[#A78BFA]" />,
    },
    default: {
      cardBg:
        'bg-slate-900 dark:bg-[#1A1A21] border border-slate-700 dark:border-[#2D3039] text-white shadow-xl',
      iconBg: 'bg-white/10 text-white',
      defaultIcon: <CheckCircle2 size={16} strokeWidth={2.5} className="text-white" />,
    },
  }[type];

  return (
    <div
      role="alert"
      className={`flex items-center gap-2.5 w-auto min-w-[200px] max-w-[360px] rounded-full ${typeConfig.cardBg} px-3.5 py-2 select-none transition-all duration-200 group`}
    >
      {/* Ícone Redondo com fundo translúcido */}
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${typeConfig.iconBg}`}
      >
        {icon || typeConfig.defaultIcon}
      </div>

      {/* Conteúdo textual: todo branco */}
      <div className="flex-1 min-w-0 pr-0.5">
        <div className="text-[13px] font-medium text-white tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
          {title}
        </div>
        {description && (
          <div className="text-xs text-white/90 mt-0.5 leading-tight whitespace-nowrap overflow-hidden text-ellipsis font-normal">
            {description}
          </div>
        )}

        {/* Botões de Ação (se houver) */}
        {(action || cancel) && (
          <div className="flex items-center gap-2 mt-2">
            {action && (
              <button
                type="button"
                onClick={(e) => {
                  action.onClick(e);
                  onClose();
                }}
                className="px-3 py-1 rounded-full bg-white hover:bg-white/90 text-emerald-700 font-semibold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                {action.label}
              </button>
            )}
            {cancel && (
              <button
                type="button"
                onClick={(e) => {
                  cancel.onClick(e);
                  onClose();
                }}
                className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white font-medium text-xs border border-white/20 transition-all active:scale-95 cursor-pointer"
              >
                {cancel.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// Sistema de Deduplicação Inteligente
// ==========================================
const recentNotifications = new Map<
  string,
  { id: string | number; timestamp: number }
>();
const DEDUP_COOLDOWN_MS = 1000; // Janela ágil de bloqueio de duplicatas consecutivas

function generateNotificationKey(
  type: NotificationType,
  title: React.ReactNode,
  options?: NotificationOptions,
): string {
  if (options?.id !== undefined) return String(options.id);
  const titleStr = typeof title === 'string' ? title : String(title);
  const descStr =
    typeof options?.description === 'string' ? options.description : '';
  return `${type}:${titleStr}:${descStr}`;
}

function showNotification(
  type: NotificationType,
  title: React.ReactNode,
  options?: NotificationOptions,
): string | number {
  const key = generateNotificationKey(type, title, options);
  const now = Date.now();
  const existing = recentNotifications.get(key);

  // Evita duplicatas consecutivas (como duplo mount do React 18/19 StrictMode ou cliques múltiplos)
  if (existing && now - existing.timestamp < DEDUP_COOLDOWN_MS) {
    return existing.id;
  }

  // Gera ID determinístico baseado no conteúdo para o Sonner atualizar no mesmo slot se ainda ativo
  const toastId =
    options?.id !== undefined
      ? options.id
      : `toast_${encodeURIComponent(key).slice(0, 36)}`;

  recentNotifications.set(key, { id: toastId, timestamp: now });

  // Limpa o registro após a janela de cooldown
  setTimeout(() => {
    const item = recentNotifications.get(key);
    if (item && item.id === toastId) {
      recentNotifications.delete(key);
    }
  }, DEDUP_COOLDOWN_MS + 200);

  // Duração rápida e dinâmica para agilidade da UX (2s para sucesso/info, 3s para erro)
  const duration = options?.duration ?? (type === 'error' ? 3000 : 2000);

  return sonnerToast.custom(
    (id) => (
      <NotificationCard
        id={id}
        type={type}
        title={title}
        description={options?.description}
        action={options?.action}
        cancel={options?.cancel}
        icon={options?.icon}
        onClose={() => {
          recentNotifications.delete(key);
          sonnerToast.dismiss(id);
        }}
      />
    ),
    {
      ...options,
      id: toastId,
      duration,
      onDismiss: (t) => {
        recentNotifications.delete(key);
        options?.onDismiss?.(t);
      },
      onAutoClose: (t) => {
        recentNotifications.delete(key);
        options?.onAutoClose?.(t);
      },
    },
  );
}

// ==========================================
// Helper Unificado `toast` e `notify`
// ==========================================
const baseToast = (
  message: React.ReactNode,
  options?: NotificationOptions,
): string | number => {
  return showNotification('default', message, options);
};

export const toast = Object.assign(baseToast, {
  success: (message: React.ReactNode, options?: NotificationOptions) =>
    showNotification('success', message, options),
  info: (message: React.ReactNode, options?: NotificationOptions) =>
    showNotification('info', message, options),
  warning: (message: React.ReactNode, options?: NotificationOptions) =>
    showNotification('warning', message, options),
  error: (message: React.ReactNode, options?: NotificationOptions) =>
    showNotification('error', message, options),
  loading: (message: React.ReactNode, options?: NotificationOptions) =>
    showNotification('loading', message, options),
  message: (message: React.ReactNode, options?: NotificationOptions) =>
    showNotification('default', message, options),
  custom: sonnerToast.custom,
  dismiss: (id?: string | number) => {
    if (id !== undefined) {
      for (const [key, value] of recentNotifications.entries()) {
        if (value.id === id) {
          recentNotifications.delete(key);
        }
      }
      return sonnerToast.dismiss(id);
    }
    recentNotifications.clear();
    return sonnerToast.dismiss();
  },
  promise: sonnerToast.promise,
  getToasts: sonnerToast.getToasts,
  getHistory: sonnerToast.getHistory,
});

export const notify = toast;

// ==========================================
// Componente Toaster Customizado
// ==========================================
export interface ToasterProps extends SonnerToasterProps {}

export const Toaster: React.FC<ToasterProps> = ({
  position = 'top-center',
  gap = 12,
  visibleToasts = 4,
  expand = false,
  ...props
}) => {
  return (
    <SonnerToaster
      theme="dark"
      position={position}
      gap={gap}
      visibleToasts={visibleToasts}
      expand={expand}
      richColors={false}
      closeButton={false}
      style={
        {
          '--width': '420px',
        } as React.CSSProperties
      }
      toastOptions={{
        className:
          '!bg-transparent !border-0 !p-0 !shadow-none !flex !justify-center',
        ...props.toastOptions,
      }}
      {...props}
    />
  );
};

export default toast;
