import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';
import { decodeExportBytes, parseAdsPowerText } from '@/services/importar-perfil/service.parser-adspower';
import type { ImportPreviewItem } from '@/services/importar-perfil/service.types';

interface DropzoneAreaProps {
  onProfilesParsed: (profiles: ImportPreviewItem[], files: File[]) => void;
  attachedFiles: File[];
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
}

export const DropzoneArea: React.FC<DropzoneAreaProps> = ({
  onProfilesParsed,
  attachedFiles,
  onRemoveFile,
  onClearFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);

  const processFiles = async (files: File[]) => {
    setReadingError(null);
    if (!files.length) return;

    const allProfiles: ImportPreviewItem[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const text = decodeExportBytes(buffer);
        const parsed = parseAdsPowerText(text);
        if (parsed.length === 0) {
          setReadingError(`Nenhum perfil reconhecido no arquivo "${file.name}". Verifique se o formato é export do AdsPower (.txt, .csv ou .json).`);
        } else {
          allProfiles.push(...parsed);
        }
      } catch (err: any) {
        console.error('Erro ao ler arquivo de importação:', err);
        setReadingError(`Falha ao ler o arquivo "${file.name}": ${err?.message || 'Formato incompatível'}`);
      }
    }

    if (allProfiles.length > 0) {
      onProfilesParsed(allProfiles, files);
    }
  };

  // Suporte a Drag & Drop Global para que arrastar qualquer arquivo na janela acione a área
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      processFiles(files);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="flex flex-col gap-3">
      {readingError && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-500 dark:text-red-400">
          <AlertCircle size={15} className="shrink-0" />
          <span>{readingError}</span>
        </div>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center select-none ${
          isDragOver
            ? 'border-[#7C3AED] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 ring-4 ring-[#7C3AED]/20 scale-[1.01]'
            : 'border-slate-300 dark:border-[#2D3039] hover:border-[#7C3AED] dark:hover:border-[#A78BFA] bg-white dark:bg-[#18191E] hover:bg-slate-50/50 dark:hover:bg-[#1C1D24]'
        }`}
      >
        <div className="pointer-events-none flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud size={28} />
        </div>

        <h3 className="pointer-events-none text-sm font-bold text-slate-900 dark:text-white mb-1">
          {isDragOver ? 'Solte os arquivos aqui para importar' : 'Arraste e solte seus arquivos do AdsPower aqui'}
        </h3>
        <p className="pointer-events-none text-xs text-slate-500 dark:text-[#9DA2B4] max-w-md mb-3">
          Suporta arquivos de exportação <span className="font-mono text-slate-700 dark:text-slate-300">.txt</span> delimitados por asteriscos, <span className="font-mono text-slate-700 dark:text-slate-300">.csv</span> ou <span className="font-mono text-slate-700 dark:text-slate-300">.json</span>.
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="h-8 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          Procurar no Computador
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.csv,.json,.xlsx,text/plain,text/csv,application/json"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-500 dark:text-[#9DA2B4] mr-1">
            Arquivos anexados ({attachedFiles.length}):
          </span>
          {attachedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-xs text-slate-800 dark:text-white shadow-2xs"
            >
              <FileText size={13} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
              <span className="font-medium max-w-[200px] truncate">{file.name}</span>
              <span className="text-[11px] text-slate-400 dark:text-[#9DA2B4]">({formatFileSize(file.size)})</span>
              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
                className="text-slate-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                title="Remover arquivo"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={onClearFiles}
            className="text-xs text-slate-400 hover:text-red-500 hover:underline transition-colors ml-auto cursor-pointer"
          >
            Limpar todos
          </button>
        </div>
      )}
    </div>
  );
};
