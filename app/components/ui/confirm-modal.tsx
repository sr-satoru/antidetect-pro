import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, Trash2, HelpCircle, X, Loader2 } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'primary';

export interface ConfirmDialogOptions {
  title?: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const renderIcon = (variant: ConfirmVariant = 'danger', customIcon?: React.ReactNode) => {
  if (customIcon) {
    switch (variant) {
      case 'danger':
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 dark:bg-[#FF4D4F]/15 text-red-600 dark:text-[#FF4D4F] border border-red-500/20 dark:border-[#FF4D4F]/25 shadow-sm shadow-red-500/10">
            {customIcon}
          </div>
        );
      case 'warning':
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-[#FAAD14]/15 text-amber-600 dark:text-[#FAAD14] border border-amber-500/20 dark:border-[#FAAD14]/25 shadow-sm shadow-amber-500/10">
            {customIcon}
          </div>
        );
      case 'info':
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 shadow-xs">
            {customIcon}
          </div>
        );
      case 'primary':
      default:
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10 dark:bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/20 dark:border-[#7C3AED]/30 shadow-xs">
            {customIcon}
          </div>
        );
    }
  }

  switch (variant) {
    case 'danger':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 dark:bg-[#FF4D4F]/15 text-red-600 dark:text-[#FF4D4F] border border-red-500/20 dark:border-[#FF4D4F]/25 shadow-sm shadow-red-500/10">
          <Trash2 size={20} />
        </div>
      );
    case 'warning':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-[#FAAD14]/15 text-amber-600 dark:text-[#FAAD14] border border-amber-500/20 dark:border-[#FAAD14]/25 shadow-sm shadow-amber-500/10">
          <AlertTriangle size={20} />
        </div>
      );
    case 'info':
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 shadow-xs">
          <Info size={20} />
        </div>
      );
    case 'primary':
    default:
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10 dark:bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/20 dark:border-[#7C3AED]/30 shadow-xs">
          <HelpCircle size={20} />
        </div>
      );
  }
};

const getConfirmButtonClasses = (variant: ConfirmVariant = 'danger') => {
  switch (variant) {
    case 'danger':
      return 'bg-[#E11D48] hover:bg-[#BE123C] text-white shadow-xs';
    case 'warning':
      return 'bg-[#D97706] hover:bg-[#B45309] text-white shadow-xs';
    case 'info':
      return 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs';
    case 'primary':
    default:
      return 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs';
  }
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmação',
  description,
  confirmText = 'Continuar',
  cancelText = 'Cancelar',
  variant = 'danger',
  icon,
  isLoading = false,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-start justify-center pt-[15vh] sm:pt-[17vh] bg-slate-900/50 dark:bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[490px] rounded-2xl border border-slate-200 dark:border-[#2D3039]/90 bg-white dark:bg-[#18191E] shadow-2xl shadow-slate-900/15 dark:shadow-black/95 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 mb-12"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-start gap-4 p-7">
          {renderIcon(variant, icon)}
          <div className="flex-1 space-y-1.5 pt-0.5 min-w-0">
            <h3
              id="confirm-modal-title"
              className="text-[15px] font-semibold text-slate-900 dark:text-[#E1E4EE] tracking-tight"
            >
              {title}
            </h3>
            {description && (
              <div className="text-xs text-slate-600 dark:text-[#9DA2B4] leading-relaxed">
                {description}
              </div>
            )}
            {children}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-700 dark:text-[#82889A] dark:hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-slate-50 dark:bg-[#141519]/80 border-t border-slate-200 dark:border-[#2D3039]/70">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="h-8.5 px-4 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#9DA2B4] dark:hover:bg-[#252733] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            autoFocus
            disabled={isLoading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-1.5 h-8.5 px-4.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getConfirmButtonClasses(
              variant,
            )}`}
          >
            {isLoading && <Loader2 size={13} className="animate-spin shrink-0" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

interface ConfirmContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setDialogState({
          isOpen: true,
          options: {
            title: options.title || 'Confirmação',
            confirmText: options.confirmText || 'Continuar',
            cancelText: options.cancelText || 'Cancelar',
            variant: options.variant || 'danger',
            ...options,
          },
          resolve,
        });
      });
    },
    [],
  );

  const handleClose = (result: boolean) => {
    if (dialogState) {
      dialogState.resolve(result);
      setDialogState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState && (
        <ConfirmModal
          isOpen={dialogState.isOpen}
          onClose={() => handleClose(false)}
          onConfirm={() => handleClose(true)}
          title={dialogState.options.title}
          description={dialogState.options.description}
          confirmText={dialogState.options.confirmText}
          cancelText={dialogState.options.cancelText}
          variant={dialogState.options.variant}
          icon={dialogState.options.icon}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export default ConfirmModal;
