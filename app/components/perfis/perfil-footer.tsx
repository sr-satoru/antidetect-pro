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
    <div className="flex shrink-0 items-center justify-between border-t border-slate-200 dark:border-[#30323E] bg-slate-100/90 dark:bg-[#1F2027] px-6 py-3.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="flex items-center gap-2 cursor-pointer rounded-md bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#1C1D24] dark:border dark:border-white/30 dark:hover:border-white px-7 py-2 text-[13px] font-medium shadow-md shadow-emerald-600/20 dark:shadow-md transition-all select-none dark:hover:bg-[#252834] active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving && <Loader2 size={14} className="animate-spin text-white" />}
          <span>{isSaving ? 'Salvando...' : 'OK'}</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="cursor-pointer rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-[#2B2D38] dark:text-[#C4C7D5] dark:hover:bg-[#363847] dark:hover:text-white px-6 py-2 text-[13px] font-medium transition-all select-none active:scale-[0.98] disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {/* Ícone flutuante de suporte */}
      <div
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-[#1C1D24] border border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white text-slate-700 dark:text-white shadow-md transition-all hover:scale-105 hover:bg-slate-50 dark:hover:bg-[#252834]"
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
