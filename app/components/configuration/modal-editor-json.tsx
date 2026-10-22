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
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151C] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] px-6 py-4 bg-slate-50 dark:bg-[#181922]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#238636]/15 text-[#2ea043] border border-[#238636]/30">
              <FileCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Editor do Preset Base Oficial (JSON)
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                Modifique diretamente o schema de configuração que alimenta novos perfis.
              </p>
            </div>
          </div>

          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] px-6 py-2 bg-slate-100/70 dark:bg-[#1B1C25] text-xs">
          <span className="font-mono text-slate-500 dark:text-[#8E92A2]">default-base-preset.json</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFormat}
              className="gap-1 h-7 text-[11px] px-2.5"
            >
              <Code2 size={12} />
              <span>Formatar JSON</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCopy}
              className="gap-1 h-7 text-[11px] px-2.5"
            >
              <Copy size={12} />
              <span>Copiar</span>
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 min-h-[380px] p-4 bg-slate-950 flex flex-col relative overflow-hidden">
          <textarea
            value={rawJsonText}
            onChange={(e) => onChangeText(e.target.value)}
            spellCheck={false}
            className="w-full flex-1 resize-none bg-transparent font-mono text-[12.5px] leading-relaxed text-emerald-400 focus:outline-hidden custom-scrollbar"
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
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/[0.08] px-6 py-3.5 bg-slate-50 dark:bg-[#181922]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetDefaults}
            className="gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white"
          >
            <RotateCcw size={12} />
            <span>Restaurar Fábrica no Editor</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" onClick={onApply} className="gap-1.5 px-4 font-bold">
              <Check size={14} />
              <span>Aplicar & Salvar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
