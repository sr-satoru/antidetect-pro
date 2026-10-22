import React, { useRef } from 'react';
import { CloudUpload, FileArchive, Image as ImageIcon } from 'lucide-react';

export interface ExtensaoArquivoFormValues {
  file?: File;
  fileName?: string;
  name: string;
  intro: string;
  iconName?: string;
}

interface AdicionarExtensaoArquivoProps {
  values: ExtensaoArquivoFormValues;
  onChange: (field: keyof ExtensaoArquivoFormValues, value: any) => void;
}

export const AdicionarExtensaoArquivo: React.FC<
  AdicionarExtensaoArquivoProps
> = ({ values, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange('file', file);
      onChange('fileName', file.name);
      if (!values.name) {
        // Sugere o nome sem a extensão
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        onChange('name', baseName.slice(0, 20));
      }
    }
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange('iconName', file.name);
    }
  };

  return (
    <div className="space-y-5 text-xs text-slate-700 dark:text-[#C9C9D2]">
      {/* 1. Pacote de instalação */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-12">
        <label className="pt-2 text-right text-xs font-medium text-slate-600 dark:text-[#C9C9D2] select-none sm:col-span-3">
          Pacote de instalação
        </label>
        <div className="space-y-1.5 sm:col-span-9">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xpi,.zip,.crx,.rar"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-[#2D3039] bg-slate-50 dark:bg-[#141519] px-4 text-xs font-medium text-slate-800 dark:text-[#F1F1F4] transition-colors hover:border-slate-400 dark:hover:border-[#41414E] hover:bg-slate-100 dark:hover:bg-[#1C1C24] shadow-xs"
          >
            <CloudUpload size={16} className="text-slate-600 dark:text-[#F1F1F4]" />
            <span>
              {values.fileName ? (
                <span className="flex items-center gap-1.5 text-slate-900 dark:text-[#F1F1F4]">
                  <FileArchive size={14} className="text-slate-600 dark:text-[#F1F1F4]" />
                  {values.fileName}
                </span>
              ) : (
                'Carregar arquivo'
              )}
            </span>
          </button>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-[#2D3039] bg-slate-100 dark:bg-[#141519] p-2 text-[11px] text-slate-600 dark:text-[#C9C9D2]">
            <span>🔒 <strong className="text-slate-800 dark:text-[#F1F1F4]">Armazenamento Local Seguro:</strong> Arquivos carregados manualmente permanecem 100% no seu dispositivo físico e nunca são transmitidos para servidores externos, garantindo privacidade e proteção total.</span>
          </div>
        </div>
      </div>

      {/* 2. Ícone */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-12">
        <label className="pt-2 text-right text-xs font-medium text-slate-600 dark:text-[#C9C9D2] select-none sm:col-span-3">
          Ícone
        </label>
        <div className="space-y-1.5 sm:col-span-9">
          <input
            type="file"
            ref={iconInputRef}
            onChange={handleIconSelect}
            accept=".png,.jpg,.jpeg"
            className="hidden"
          />
          <div
            onClick={() => iconInputRef.current?.click()}
            className="flex h-24 w-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 dark:border-[#2D3039] bg-slate-50 dark:bg-[#141519] p-3 text-center transition-colors hover:border-slate-400 dark:hover:border-[#41414E] hover:bg-slate-100 dark:hover:bg-[#1C1C24] shadow-xs"
          >
            {values.iconName ? (
              <div className="flex flex-col items-center text-xs text-slate-800 dark:text-[#F1F1F4]">
                <ImageIcon size={20} className="mb-1 text-slate-600 dark:text-[#F1F1F4]" />
                <span className="max-w-[120px] truncate text-[11px]">
                  {values.iconName}
                </span>
              </div>
            ) : (
              <>
                <CloudUpload size={22} className="text-slate-400 dark:text-[#90909D]" />
                <span className="text-[11px] leading-tight text-slate-500 dark:text-[#90909D]">
                  Arraste e solte imagens ou clique para carregar
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#90909D]">
            Opcional, pelo menos 60*60 pixels, proporção 1:1, suporte formato
            jpg/jpeg/png, limite 1M
          </p>
        </div>
      </div>

      {/* 3. Nome da extensão */}
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <label className="text-right text-xs font-medium text-slate-600 dark:text-[#C9C9D2] select-none sm:col-span-3">
          <span className="mr-1 text-red-500">*</span> Nome da extensão
        </label>
        <div className="relative sm:col-span-9">
          <input
            type="text"
            required
            maxLength={20}
            placeholder="Obrigatório, por favor preencha o nome da extensão"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value.slice(0, 20))}
            className="h-9 w-full rounded-lg border border-slate-300 dark:border-[#2D3039] bg-white dark:bg-[#141519] px-3.5 pr-14 text-xs text-slate-900 dark:text-[#F1F1F4] placeholder-slate-400 dark:placeholder-[#66666F] transition-colors focus:border-slate-400 dark:focus:border-[#41414E] focus:outline-hidden shadow-2xs"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-slate-400 dark:text-[#90909D]">
            {values.name.length} / 20
          </span>
        </div>
      </div>

      {/* 4. Introdução */}
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <label className="text-right text-xs font-medium text-slate-600 dark:text-[#C9C9D2] select-none sm:col-span-3">
          Introdução
        </label>
        <div className="relative sm:col-span-9">
          <input
            type="text"
            maxLength={200}
            placeholder="Opcional, preencha a breve descrição da extensão"
            value={values.intro}
            onChange={(e) => onChange('intro', e.target.value.slice(0, 200))}
            className="h-9 w-full rounded-lg border border-slate-300 dark:border-[#2D3039] bg-white dark:bg-[#141519] px-3.5 pr-16 text-xs text-slate-900 dark:text-[#F1F1F4] placeholder-slate-400 dark:placeholder-[#66666F] transition-colors focus:border-slate-400 dark:focus:border-[#41414E] focus:outline-hidden shadow-2xs"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-slate-400 dark:text-[#90909D]">
            {values.intro.length} / 200
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdicionarExtensaoArquivo;
