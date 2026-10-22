import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { toast } from '@/components/ui/notification';
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
      if (!fileValues.file) {
        toast.warning('Por favor, selecione um arquivo de extensão (.zip, .xpi ou .crx).');
        return;
      }
      if (!fileValues.name.trim()) {
        toast.warning('Por favor, informe o nome da extensão.');
        return;
      }
      const isXpi = fileValues.fileName?.toLowerCase().endsWith('.xpi');
      const isCrx = fileValues.fileName?.toLowerCase().endsWith('.crx');
      onSave({
        file: fileValues.file,
        fileName: fileValues.fileName,
        name: fileValues.name.trim(),
        description:
          fileValues.intro.trim() ||
          (isXpi
            ? 'Extensão nativa do Firefox (.xpi) carregada manualmente.'
            : isCrx
            ? 'Extensão do Chrome (.crx) carregada manualmente.'
            : 'Extensão carregada manualmente por arquivo.'),
        iconType: isXpi ? 'firefox' : isCrx ? 'chrome' : 'custom',
        iconBg: '#00FF66',
        provider: isXpi ? 'Firefox Add-on (.xpi)' : isCrx ? 'Chrome Extension (.crx)' : 'Pacote Local',
        tab: 'team',
        enabled: true,
        status: 'available',
      });
    } else {
      if (!webValues.url.trim()) {
        toast.warning('Por favor, informe a URL da extensão (Firefox AMO ou Chrome Web Store).');
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
            'Extensão oficial importada do Firefox Add-ons (AMO). Compatível com AstroFox.',
          iconType: 'firefox',
          iconBg: '#FF5500',
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
          iconBg: '#00FF66',
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] sm:pt-[12vh] p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] shadow-2xl shadow-slate-900/15 dark:shadow-2xl animate-in fade-in zoom-in-95 duration-200 mb-12">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-white/10 px-7 select-none">
          <span className="text-base font-semibold text-slate-900 dark:text-white">
            Adicionar extensão
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#8E92A2] transition-colors dark:hover:bg-white/10 dark:hover:text-white"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Linha do Tipo: Segmented Control */}
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
            <label className="text-right text-[12.5px] font-medium text-slate-700 dark:text-[#C8CBD4] select-none sm:col-span-3">
              Tipo
            </label>
            <div className="sm:col-span-9">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#0C0D12] p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'file'
                      ? 'bg-white dark:bg-[#1F212D] text-slate-900 dark:text-white border border-slate-200 dark:border-white/15 shadow-xs'
                      : 'text-slate-600 dark:text-[#8E92A2] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('web')}
                  className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'web'
                      ? 'bg-white dark:bg-[#1F212D] text-slate-900 dark:text-white border border-slate-200 dark:border-white/15 shadow-xs'
                      : 'text-slate-600 dark:text-[#8E92A2] hover:text-slate-900 dark:hover:text-white'
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
        <div className="flex h-16 items-center justify-start gap-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] px-6 select-none sm:pl-36">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex cursor-pointer items-center justify-center rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white px-6 py-2 text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-[#8E92A2] transition-colors dark:hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalAdicionarExtensao;
