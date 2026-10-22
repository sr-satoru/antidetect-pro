import React from 'react';
import { FileCode, X, Code2, Copy, AlertCircle, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ModalEditorJsonProps {
  isOpen: boolean;
  onClose: () => void;
  rawJsonText: string;
  rawJsonError: string | null;
  onChangeText: (text: string) => void;
  onFormat: () => void;
  onCopy: () => void;
  onResetDefaults: () => void;
  onApply: () => void;
}

export const ModalEditorJson: React.FC<ModalEditorJsonProps> = ({
  isOpen,
  onClose,
  rawJsonText,
  rawJsonError,
  onChangeText,
  onFormat,
  onCopy,
  onResetDefaults,
  onApply,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#2D3039] px-6 py-4 bg-[#F8F7F5] dark:bg-[#1F2026]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30">
              <FileCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Editor do Preset Base Oficial (JSON)
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-0.5">
                Modifique diretamente o schema de configuração que alimenta novos perfis.
              </p>
            </div>
          </div>

          <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-lg text-slate-400 hover:text-slate-700 dark:text-[#9DA2B4] dark:hover:text-white dark:hover:bg-[#282A33]">
            <X size={16} />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#2D3039] px-6 py-2.5 bg-slate-100/70 dark:bg-[#1F2026] text-xs">
          <span className="font-mono text-slate-500 dark:text-[#9DA2B4]">default-base-preset.json</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFormat}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] text-xs font-medium text-slate-700 dark:text-[#E2E4EC] transition-colors cursor-pointer shadow-xs"
            >
              <Code2 size={13} />
              <span>Formatar JSON</span>
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] text-xs font-medium text-slate-700 dark:text-[#E2E4EC] transition-colors cursor-pointer shadow-xs"
            >
              <Copy size={13} />
              <span>Copiar</span>
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 min-h-[380px] p-4 bg-slate-950 flex flex-col relative overflow-hidden">
          <textarea
            value={rawJsonText}
            onChange={(e) => onChangeText(e.target.value)}
            spellCheck={false}
            className="w-full flex-1 resize-none bg-transparent font-mono text-xs leading-relaxed text-violet-300 focus:outline-hidden custom-scrollbar"
            placeholder="Insira o JSON do preset..."
          />
          {rawJsonError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              <span>{rawJsonError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-[#2D3039] px-6 py-3.5 bg-[#F8F7F5] dark:bg-[#1F2026]">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-[#9DA2B4] dark:hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Restaurar Fábrica no Editor</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] text-slate-700 dark:text-[#E2E4EC] text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onApply}
              className="h-9 px-5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98] cursor-pointer"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Aplicar & Salvar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
