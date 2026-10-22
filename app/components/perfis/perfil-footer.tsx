import React from 'react';
import { Loader2 } from 'lucide-react';

interface PerfilFooterProps {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const PerfilFooter: React.FC<PerfilFooterProps> = ({
  isSaving,
  onSave,
  onCancel,
}) => {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] px-6 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="flex h-[38px] items-center gap-2 cursor-pointer rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 text-[13px] font-semibold shadow-xs hover:shadow-[0_0_12px_rgba(124,58,237,0.35)] transition-all select-none active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving && <Loader2 size={14} className="animate-spin text-white" />}
          <span>{isSaving ? 'Salvando...' : 'OK'}</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="flex h-[38px] items-center cursor-pointer rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-100 dark:hover:bg-[#282A33] text-slate-700 dark:text-[#9DA2B4] dark:hover:text-white px-5 text-[13px] font-medium transition-all select-none active:scale-[0.98] disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {/* Ícone flutuante de suporte */}
      <div
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] hover:bg-slate-100 dark:hover:bg-[#282A33] text-slate-600 dark:text-[#9DA2B4] dark:hover:text-white shadow-xs transition-all active:scale-[0.98]"
        title="Suporte"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    </div>
  );
};
