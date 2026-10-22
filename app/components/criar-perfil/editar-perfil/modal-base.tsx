import React from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2 } from 'lucide-react';

export interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  saveLabel?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const ModalBase: React.FC<ModalBaseProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
  saveLabel = 'Salvar Alteração',
  maxWidth = 'max-w-[560px]',
  children,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/85 p-6 select-none"
      onClick={onClose}
    >
      <div
        className={`animate-in zoom-in-95 w-full ${maxWidth} rounded-2xl border border-slate-200 dark:border-[#343644] bg-white dark:bg-[#1C1E26] p-7 shadow-2xl shadow-slate-900/15 dark:shadow-black/95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-5"
        >
          {children}

          <div className="flex justify-end items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="cursor-pointer rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9EA2AE] dark:hover:bg-white/5 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isSaveDisabled}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#3366E6] hover:bg-[#2A58CF] text-white px-6 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] shadow-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Check size={16} strokeWidth={2.5} />
              )}
              <span>{saveLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ModalBase;
