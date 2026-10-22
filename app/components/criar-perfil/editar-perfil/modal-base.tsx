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
  maxWidth = 'max-w-[600px]',
  children,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[14vh] bg-slate-900/40 dark:bg-black/85 p-6 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`animate-in zoom-in-95 w-full ${maxWidth} rounded-2xl border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#28292E] p-7 shadow-2xl duration-150 mb-12`}
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
              className="h-[38px] px-5 rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#24252A] hover:bg-slate-100 dark:hover:bg-[#323338] text-slate-700 dark:text-[#A6A9B6] text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isSaveDisabled}
              className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white px-6 text-[13px] font-semibold transition-all active:scale-[0.98] shadow-xs disabled:cursor-not-allowed disabled:opacity-40"
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
