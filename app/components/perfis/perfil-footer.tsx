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
    <div className="flex shrink-0 items-center justify-between border-t border-[#30323E] bg-[#1F2027] px-6 py-3.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="flex items-center gap-2 cursor-pointer rounded-md bg-[#0D62FF] px-7 py-2 text-[13px] font-medium text-white shadow transition-all select-none hover:bg-[#0B54DC] active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving && <Loader2 size={14} className="animate-spin text-white" />}
          <span>{isSaving ? 'Salvando...' : 'OK'}</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="cursor-pointer rounded-md bg-[#2B2D38] px-6 py-2 text-[13px] font-medium text-[#C4C7D5] transition-all select-none hover:bg-[#363847] hover:text-white active:scale-[0.98] disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {/* Ícone flutuante de suporte */}
      <div
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#0D62FF] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#0B54DC]"
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
