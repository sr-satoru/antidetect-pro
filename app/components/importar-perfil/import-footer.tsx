import React from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

interface ImportFooterProps {
  totalCount: number;
  isImporting: boolean;
  onImport: () => void;
  onCancel: () => void;
}

export const ImportFooter: React.FC<ImportFooterProps> = ({
  totalCount,
  isImporting,
  onImport,
  onCancel,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] px-6 py-3.5 select-none shrink-0">
      <div className="flex items-center gap-2 text-xs">
        {totalCount > 0 ? (
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-[#E2E4EC]">
            <CheckCircle size={15} className="text-emerald-500" />
            <span>
              <strong className="text-slate-900 dark:text-white font-bold">{totalCount}</strong> {totalCount === 1 ? 'perfil pronto' : 'perfis prontos'} para gravação no banco de dados.
            </span>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-[#6C7284]">
            Nenhum perfil carregado. Anexe arquivos ou cole o texto acima.
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isImporting}
          className="h-9 px-4 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] hover:bg-slate-50 dark:hover:bg-[#282A33] text-slate-700 dark:text-[#E2E4EC] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={onImport}
          disabled={isImporting || totalCount === 0}
          className="h-9 px-5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isImporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Importando...</span>
            </>
          ) : (
            <span>
              Importar {totalCount > 0 ? `${totalCount} Perfis` : 'Perfis'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
