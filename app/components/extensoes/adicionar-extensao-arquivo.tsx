import React, { useRef } from 'react';
import { CloudUpload, FileArchive, Image as ImageIcon } from 'lucide-react';

export interface ExtensaoArquivoFormValues {
  fileName?: string;
  name: string;
  intro: string;
  iconName?: string;
}

interface AdicionarExtensaoArquivoProps {
  values: ExtensaoArquivoFormValues;
  onChange: (field: keyof ExtensaoArquivoFormValues, value: string) => void;
}

export const AdicionarExtensaoArquivo: React.FC<
  AdicionarExtensaoArquivoProps
> = ({ values, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    <div className="space-y-5 text-[13px] text-[#C8CBD4]">
      {/* 1. Pacote de instalação */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-12">
        <label className="pt-2 text-right text-[12.5px] font-medium text-[#C8CBD4] select-none sm:col-span-3">
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
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#44475A] bg-[#161720] px-4 py-2 text-xs font-medium text-[#DFE104] transition-colors hover:border-[#DFE104] hover:bg-[#1E1F2A]"
          >
            <CloudUpload size={16} className="text-[#2F80ED]" />
            <span>
              {values.fileName ? (
                <span className="flex items-center gap-1.5 text-white">
                  <FileArchive size={14} className="text-[#2F80ED]" />
                  {values.fileName}
                </span>
              ) : (
                'Carregar arquivo'
              )}
            </span>
          </button>
          <div className="space-y-1 text-[11px] leading-relaxed text-[#7C8092]">
            <p>
              <span className="font-semibold text-[#FF7139]">Nativo Camoufox:</span> arquivos <span className="font-mono text-white">.xpi</span> do Firefox e pacotes <span className="font-mono text-white">.zip</span> (limite 60M).
            </p>
            <p>
              Arquivos <span className="font-mono text-[#A6ABB9]">.crx</span> (Chrome) podem ser convertidos para <span className="font-mono text-[#A6ABB9]">.zip</span> ou <span className="font-mono text-[#A6ABB9]">.xpi</span>.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Ícone */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-12">
        <label className="pt-2 text-right text-[12.5px] font-medium text-[#C8CBD4] select-none sm:col-span-3">
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
            className="flex h-24 w-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#44475A] bg-[#161720] p-3 text-center transition-colors hover:border-[#2F80ED] hover:bg-[#1C1E2A]"
          >
            {values.iconName ? (
              <div className="flex flex-col items-center text-xs text-white">
                <ImageIcon size={20} className="mb-1 text-[#2F80ED]" />
                <span className="max-w-[120px] truncate text-[11px]">
                  {values.iconName}
                </span>
              </div>
            ) : (
              <>
                <CloudUpload size={22} className="text-[#2F80ED]" />
                <span className="text-[10.5px] leading-tight text-[#8E92A2]">
                  Arraste e solte imagens ou clique para carregar
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-[#7C8092]">
            Opcional, pelo menos 60*60 pixels, proporção 1:1, suporte formato
            jpg/jpeg/png, limite 1M
          </p>
        </div>
      </div>

      {/* 3. Nome da extensão */}
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <label className="text-right text-[12.5px] font-medium text-[#C8CBD4] select-none sm:col-span-3">
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
            className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 pr-14 text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-[#6E7284]">
            {values.name.length} / 20
          </span>
        </div>
      </div>

      {/* 4. Introdução */}
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <label className="text-right text-[12.5px] font-medium text-[#C8CBD4] select-none sm:col-span-3">
          Introdução
        </label>
        <div className="relative sm:col-span-9">
          <input
            type="text"
            maxLength={200}
            placeholder="Opcional, preencha a breve descrição da extensão"
            value={values.intro}
            onChange={(e) => onChange('intro', e.target.value.slice(0, 200))}
            className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 pr-16 text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-[#6E7284]">
            {values.intro.length} / 200
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdicionarExtensaoArquivo;
