import React, { useState } from 'react';
import { GeralTab } from '@/components/criar-perfil/geral';
import { ProxyTab } from '@/components/criar-perfil/proxy';
import { PlataformaTab } from '@/components/criar-perfil/plataforma';
import { ImpressaoDigitalTab } from '@/components/criar-perfil/impressoes';
import { AvancadoTab } from '@/components/criar-perfil/avancado';
import { FileCode, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalEditorJson } from './modal-editor-json';
import { serviceConfiguration } from '@/services/configuration';
import { toast } from '@/components/ui/notification';

export interface NavegadorTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
  onSave: () => void;
  onReset: () => void;
  onPresetImported?: (newFormData: any) => void;
}

export const NavegadorTab: React.FC<NavegadorTabProps> = ({
  formData,
  onChange,
  onSave,
  onReset,
  onPresetImported,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Modal para visualização e edição de JSON bruto
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);

  const handleOpenJsonModal = () => {
    setRawJsonText(serviceConfiguration.exportPresetJson(formData));
    setRawJsonError(null);
    setIsJsonModalOpen(true);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
      setRawJsonError(null);
    } catch (err: any) {
      setRawJsonError(err.message || 'JSON inválido');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJsonText);
    toast.success('JSON copiado para a área de transferência');
  };

  const handleApplyRawJson = () => {
    try {
      const merged = serviceConfiguration.importPresetJson(rawJsonText);
      if (onPresetImported) {
        onPresetImported({
          ...serviceConfiguration.getInitialPresetFormData(),
          ...merged,
        });
      }
      setIsJsonModalOpen(false);
      toast.success('Preset JSON atualizado e aplicado com sucesso!');
    } catch (err: any) {
      setRawJsonError(err.message || 'Erro ao processar JSON');
    }
  };

  const handleDownloadJson = () => {
    serviceConfiguration.downloadPresetJson(formData);
  };

  const handleUploadJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const merged = await serviceConfiguration.uploadPresetJson(file);
      if (onPresetImported) {
        onPresetImported({
          ...serviceConfiguration.getInitialPresetFormData(),
          ...merged,
        });
      }
    } catch {
      // toast já disparado no service
    }
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 focus-visible:outline-none">
      {/* ─── Seção 1: Geral ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <span className="text-[12px] font-medium text-slate-500 dark:text-[#7E8294] select-none">
            Geral
          </span>
          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        <GeralTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 2: Proxy ────────────────────────────────────── */}
      <div className="space-y-4">
        <ProxyTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 3: Plataforma ────────────────────────────────── */}
      <div className="space-y-4">
        <PlataformaTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 4: Impressão Digital (Fingerprint) ───────────── */}
      <div className="space-y-4">
        <ImpressaoDigitalTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 5: Avançado ──────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <span className="text-[12px] font-medium text-slate-500 dark:text-[#7E8294] select-none">
            Avançado
          </span>
          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        <AvancadoTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Ações Inferiores (Conforme referência do sistema) ───── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-4 border-t border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-[#1877F2] hover:bg-[#166fe5] px-6 py-2.5 text-[13px] font-semibold text-white shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            Gravar a Configuração
          </button>
          <button
            type="button"
            onClick={onReset}
            className="text-[13px] text-slate-500 hover:text-slate-800 dark:text-[#8E92A2] dark:hover:text-white transition-colors cursor-pointer select-none"
          >
            Restaurar configurações padrão
          </button>
        </div>

        {/* Utilitários Secundários de JSON */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleUploadJson}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white"
          >
            <Upload size={13} />
            <span>Importar JSON</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadJson}
            className="gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white"
          >
            <Download size={13} />
            <span>Exportar JSON</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenJsonModal}
            className="gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white"
          >
            <FileCode size={13} />
            <span>Editor JSON</span>
          </Button>
        </div>
      </div>

      {/* Modal Isolado de Edição de JSON */}
      <ModalEditorJson
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        rawJsonText={rawJsonText}
        rawJsonError={rawJsonError}
        onChangeText={(text) => {
          setRawJsonText(text);
          if (rawJsonError) setRawJsonError(null);
        }}
        onFormat={handleFormatJson}
        onCopy={handleCopyJson}
        onResetDefaults={() => {
          setRawJsonText(serviceConfiguration.exportPresetJson(serviceConfiguration.resetAll().formData));
          setRawJsonError(null);
          toast.info('JSON restaurado para os padrões de fábrica');
        }}
        onApply={handleApplyRawJson}
      />
    </div>
  );
};
