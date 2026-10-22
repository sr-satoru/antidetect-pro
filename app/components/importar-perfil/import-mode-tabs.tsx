import React from 'react';
import { UploadCloud, ClipboardList } from 'lucide-react';

export type ImportMode = 'file' | 'paste';

interface ImportModeTabsProps {
  activeMode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
}

export const ImportModeTabs: React.FC<ImportModeTabsProps> = ({
  activeMode,
  onModeChange,
}) => {
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#141519] border border-slate-200/80 dark:border-[#2D3039] w-fit select-none">
      <button
        type="button"
        onClick={() => onModeChange('file')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          activeMode === 'file'
            ? 'bg-white dark:bg-[#252733] text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <UploadCloud size={14} className={activeMode === 'file' ? 'text-[#7C3AED] dark:text-[#A78BFA]' : ''} />
        <span>Arquivo (Drag & Drop)</span>
      </button>

      <button
        type="button"
        onClick={() => onModeChange('paste')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          activeMode === 'paste'
            ? 'bg-white dark:bg-[#252733] text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <ClipboardList size={14} className={activeMode === 'paste' ? 'text-[#7C3AED] dark:text-[#A78BFA]' : ''} />
        <span>Colar Texto do AdsPower</span>
      </button>
    </div>
  );
};
