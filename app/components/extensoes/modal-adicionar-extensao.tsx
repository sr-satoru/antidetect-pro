import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  AdicionarExtensaoArquivo,
  ExtensaoArquivoFormValues,
} from './adicionar-extensao-arquivo';
import {
  AdicionarExtensaoWeb,
  ExtensaoWebFormValues,
} from './adicionar-extensao-web';

interface ModalAdicionarExtensaoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const ModalAdicionarExtensao: React.FC<ModalAdicionarExtensaoProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'web'>('file');

  // File form state
  const [fileValues, setFileValues] = useState<ExtensaoArquivoFormValues>({
    name: '',
    intro: '',
  });

  // Web form state
  const [webValues, setWebValues] = useState<ExtensaoWebFormValues>({
    url: '',
  });

  if (!isOpen) return null;

  const handleFileChange = (
    field: keyof ExtensaoArquivoFormValues,
    value: string,
  ) => {
    setFileValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleWebChange = (
    field: keyof ExtensaoWebFormValues,
    value: string,
  ) => {
    setWebValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (activeTab === 'file') {
      if (!fileValues.name.trim()) {
        alert('Por favor, informe o nome da extensão.');
        return;
      }
      const isXpi = fileValues.fileName?.toLowerCase().endsWith('.xpi');
      onSave({
        name: fileValues.name.trim(),
        description:
          fileValues.intro.trim() ||
          (isXpi
            ? 'Extensão nativa do Firefox (.xpi) carregada manualmente.'
            : 'Extensão carregada manualmente por arquivo.'),
        iconType: isXpi ? 'firefox' : 'custom',
        iconBg: '#2F80ED',
        provider: isXpi ? 'Firefox Add-on (.xpi)' : 'Pacote Local',
        providerUrl: '#',
        tab: 'team',
        enabled: true,
        status: 'available',
      });
    } else {
      if (!webValues.url.trim()) {
        alert('Por favor, informe a URL da extensão (Firefox AMO ou Chrome Web Store).');
        return;
      }

      const url = webValues.url.trim();
      const isFirefox = url.toLowerCase().includes('addons.mozilla.org');

      if (isFirefox) {
        // Ex: https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/
        const match = url.match(/addon\/([^/?#]+)/i);
        const rawSlug = match ? match[1] : (url.split('/').filter(Boolean).pop() || 'Nova Extensão');
        const cleanName = decodeURIComponent(rawSlug)
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        onSave({
          name: cleanName || 'Nova Extensão Firefox',
          description:
            'Extensão oficial importada do Firefox Add-ons (AMO). Compatível com Camoufox.',
          iconType: 'firefox',
          iconBg: '#2F80ED',
          provider: 'Firefox Add-ons',
          providerUrl: url,
          tab: 'team',
          enabled: true,
          status: 'available',
        });
      } else {
        // Extrai um nome amigável a partir da URL do Chrome
        const urlParts = url.split('/').filter(Boolean);
        const detailIndex = urlParts.indexOf('detail');
        const rawSlug =
          detailIndex !== -1 && urlParts[detailIndex + 1]
            ? urlParts[detailIndex + 1]
            : urlParts[urlParts.length - 1] || 'Nova Extensão';
        const cleanName = decodeURIComponent(rawSlug)
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        onSave({
          name: cleanName || 'Nova Extensão Chrome',
          description: 'Extensão importada diretamente da Chrome Web Store.',
          iconType: 'chrome',
          iconBg: '#2F80ED',
          provider: 'Chrome Web Store',
          providerUrl: url,
          tab: 'team',
          enabled: true,
          status: 'available',
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[#333543] bg-[#22242C] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#2F3240] px-6 select-none">
          <span className="text-base font-semibold text-white">
            Adicionar extensão
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Linha do Tipo: Segmented Control */}
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
            <label className="text-right text-[12.5px] font-medium text-[#C8CBD4] select-none sm:col-span-3">
              Tipo
            </label>
            <div className="sm:col-span-9">
              <div className="inline-flex rounded-lg border border-[#333543] bg-[#161720] p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'file'
                      ? 'bg-[#3A3D4D] text-white shadow-xs'
                      : 'text-[#8E92A2] hover:text-white'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('web')}
                  className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'web'
                      ? 'bg-[#3A3D4D] text-white shadow-xs'
                      : 'text-[#8E92A2] hover:text-white'
                  }`}
                >
                  Loja online (Firefox / Chrome)
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo Dinâmico conforme a seleção */}
          {activeTab === 'file' ? (
            <AdicionarExtensaoArquivo
              values={fileValues}
              onChange={handleFileChange}
            />
          ) : (
            <AdicionarExtensaoWeb
              values={webValues}
              onChange={handleWebChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex h-16 items-center justify-start gap-4 border-t border-[#2F3240] bg-[#1C1D24] px-6 select-none sm:pl-36">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex cursor-pointer items-center justify-center rounded-lg bg-[#2F80ED] px-6 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#256fd1] active:scale-[0.98]"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-xs font-medium text-[#8E92A2] transition-colors hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAdicionarExtensao;
