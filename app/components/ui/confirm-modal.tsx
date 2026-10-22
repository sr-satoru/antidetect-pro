import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, Trash2, HelpCircle, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'primary';

export interface ConfirmDialogOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

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

  const renderIcon = (variant?: ConfirmVariant) => {
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
      case 'primary':
      default:
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-[#238636] dark:text-[#2ea043] border border-emerald-500/20 dark:border-emerald-500/30 shadow-xs">
            <HelpCircle size={20} />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = (variant?: ConfirmVariant) => {
    switch (variant) {
      case 'danger':
        return 'bg-[#E11D48] hover:bg-[#BE123C] text-white shadow-xs';
      case 'warning':
        return 'bg-[#D97706] hover:bg-[#B45309] text-white shadow-xs';
      case 'info':
      case 'primary':
      default:
        return 'bg-[#238636] hover:bg-[#2ea043] text-white shadow-xs';
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState?.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10001] flex items-start justify-center pt-[15vh] sm:pt-[17vh] bg-slate-900/40 dark:bg-black/80 p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-[490px] rounded-2xl border border-slate-200 dark:border-[#303241]/90 bg-white dark:bg-[#1A1C24] shadow-2xl shadow-slate-900/15 dark:shadow-black/95 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 mb-12">
              <div className="flex items-start gap-4 p-7">
                {renderIcon(dialogState.options.variant)}
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-[#E1E4EE] tracking-tight">
                    {dialogState.options.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#8E92A2] leading-relaxed">
                    {dialogState.options.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="text-slate-400 hover:text-slate-700 dark:text-[#6C7082] dark:hover:text-white transition-colors cursor-pointer p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-slate-50 dark:bg-[#14151B]/80 border-t border-slate-200 dark:border-[#2C2E3B]/70">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="h-8.5 px-4 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8E92A2] dark:hover:bg-[#252733] dark:hover:text-white transition-colors cursor-pointer"
                >
                  {dialogState.options.cancelText}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => handleClose(true)}
                  className={`h-8.5 px-4.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${getConfirmButtonClasses(
                    dialogState.options.variant,
                  )}`}
                >
                  {dialogState.options.confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body,
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
