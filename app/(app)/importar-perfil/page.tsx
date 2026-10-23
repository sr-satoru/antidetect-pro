import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImportHeader } from '@/components/importar-perfil/import-header';
import { ImportModeTabs, type ImportMode } from '@/components/importar-perfil/import-mode-tabs';
import { DropzoneArea } from '@/components/importar-perfil/dropzone-area';
import { PasteTextArea } from '@/components/importar-perfil/paste-text-area';
import { BatchOptionsCard } from '@/components/importar-perfil/batch-options-card';
import { PreviewTable } from '@/components/importar-perfil/preview-table';
import { ImportFooter } from '@/components/importar-perfil/import-footer';
import { serviceImportarPerfil } from '@/services/importar-perfil/service.importar-perfil';
import type { ImportPreviewItem } from '@/services/importar-perfil/service.types';
import { toast } from '@/components/ui/notification';

export const ImportarPerfilPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<ImportMode>('file');

  // Perfis analisados e prontos para prévia
  const [parsedProfiles, setParsedProfiles] = useState<ImportPreviewItem[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [pastedRawText, setPastedRawText] = useState<string>('');

  // Opções do lote
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedKernel, setSelectedKernel] = useState<string>('auto');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [overrideGroup, setOverrideGroup] = useState<boolean>(false);

  // Estratégia de proxy do lote: 'none' (Conexão direta), 'keep' (Do arquivo), 'override' (Customizado)
  const [proxyStrategy, setProxyStrategy] = useState<string>('none');
  const [customProxyType, setCustomProxyType] = useState<string>('http');
  const [customProxyHost, setCustomProxyHost] = useState<string>('');
  const [customProxyPort, setCustomProxyPort] = useState<string>('');
  const [customProxyUser, setCustomProxyUser] = useState<string>('');
  const [customProxyPass, setCustomProxyPass] = useState<string>('');

  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Callback ao soltar/anexar arquivos
  const handleFilesParsed = useCallback(
    (profiles: ImportPreviewItem[], files: File[]) => {
      setParsedProfiles(profiles);
      setAttachedFiles(files);
    },
    [],
  );

  // Callback ao colar texto
  const handleTextParsed = useCallback(
    (profiles: ImportPreviewItem[], rawText: string) => {
      setParsedProfiles(profiles);
      setPastedRawText(rawText);
    },
    [],
  );

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setParsedProfiles([]);
      }
      return updated;
    });
  };

  const handleClearAttachedFiles = () => {
    setAttachedFiles([]);
    setParsedProfiles([]);
  };

  const handleRemovePreviewItem = (index: number) => {
    setParsedProfiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submissão do lote para o backend Rust
  const handleImport = async () => {
    if (parsedProfiles.length === 0 && !pastedRawText.trim()) {
      toast.error('Nenhum perfil carregado para importação.');
      return;
    }

    try {
      setIsImporting(true);

      const payloadProfiles = parsedProfiles.map((p) => {
        const itemKernel =
          selectedKernel === 'auto'
            ? p.kernel || 'AstroBrowser'
            : selectedKernel;

        return {
          id: p.id,
          name: p.name,
          group: overrideGroup && selectedGroup ? selectedGroup : p.group || selectedGroup || undefined,
          notes: p.notes,
          username: p.username,
          password: p.password,
          twofa: p.twofa,
          kernel: itemKernel,
          os: p.os || 'windows',
          platform: p.platform || selectedPlatform || undefined,
          browser_version: p.browser_version,
          initial_urls: p.initial_urls,
          proxy_type: p.proxy_type,
          proxy_host: p.proxy_host,
          proxy_port: p.proxy_port,
          proxy_username: p.proxy_username,
          proxy_password: p.proxy_password,
          screen_width: p.screen_width,
          screen_height: p.screen_height,
          user_agent: p.user_agent,
          cookies: p.cookies || [],
        };
      });

      const res = await serviceImportarPerfil.importBatch({
        profiles: payloadProfiles,
        raw_text: activeMode === 'paste' && pastedRawText.trim() ? pastedRawText : undefined,
        default_group: selectedGroup || undefined,
        default_kernel: selectedKernel,
        default_platform: selectedPlatform || undefined,
        proxy_strategy: proxyStrategy,
        default_proxy_type: proxyStrategy === 'override' ? customProxyType : undefined,
        default_proxy_host: proxyStrategy === 'override' ? customProxyHost : undefined,
        default_proxy_port:
          proxyStrategy === 'override' && customProxyPort ? Number(customProxyPort) : undefined,
        default_proxy_username: proxyStrategy === 'override' ? customProxyUser : undefined,
        default_proxy_password: proxyStrategy === 'override' ? customProxyPass : undefined,
      });

      if (res.imported > 0) {
        toast.success(
          `${res.imported} ${res.imported === 1 ? 'perfil importado' : 'perfis importados'} com sucesso!`,
        );
        navigate('/perfis');
      } else {
        toast.error(`Falha ao importar perfis: ${res.errors.join('; ') || 'Nenhum perfil válido gravado.'}`);
      }
    } catch (err: any) {
      console.error('Erro na requisição de importação:', err);
      toast.error(`Erro ao importar: ${err?.message || 'Falha de comunicação com o servidor local.'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] shadow-xs">
      {/* Cabeçalho */}
      <ImportHeader />

      {/* Conteúdo Principal Rolável */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 lg:p-7 flex flex-col gap-6">
        {/* Alternador de Modo */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <ImportModeTabs activeMode={activeMode} onModeChange={setActiveMode} />
          <span className="text-xs text-slate-400 dark:text-[#9DA2B4]">
            Escolha se prefere arrastar arquivos ou colar o texto diretamente.
          </span>
        </div>

        {/* Área de Entrada: Arquivo ou Colar Texto */}
        {activeMode === 'file' ? (
          <DropzoneArea
            onProfilesParsed={handleFilesParsed}
            attachedFiles={attachedFiles}
            onRemoveFile={handleRemoveAttachedFile}
            onClearFiles={handleClearAttachedFiles}
          />
        ) : (
          <PasteTextArea
            onProfilesParsed={handleTextParsed}
            rawText={pastedRawText}
          />
        )}

        {/* Card de Configurações do Lote */}
        <BatchOptionsCard
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedKernel={selectedKernel}
          onKernelChange={setSelectedKernel}
          selectedPlatform={selectedPlatform}
          onPlatformChange={setSelectedPlatform}
          overrideGroup={overrideGroup}
          onOverrideGroupChange={setOverrideGroup}
          proxyStrategy={proxyStrategy}
          onProxyStrategyChange={setProxyStrategy}
          customProxyType={customProxyType}
          onCustomProxyTypeChange={setCustomProxyType}
          customProxyHost={customProxyHost}
          onCustomProxyHostChange={setCustomProxyHost}
          customProxyPort={customProxyPort}
          onCustomProxyPortChange={setCustomProxyPort}
          customProxyUser={customProxyUser}
          onCustomProxyUserChange={setCustomProxyUser}
          customProxyPass={customProxyPass}
          onCustomProxyPassChange={setCustomProxyPass}
        />

        {/* Tabela de Pré-visualização ao Vivo */}
        <PreviewTable
          profiles={parsedProfiles}
          onRemoveItem={handleRemovePreviewItem}
          defaultGroup={selectedGroup}
          overrideGroup={overrideGroup}
          selectedKernel={selectedKernel}
          proxyStrategy={proxyStrategy}
          customProxyType={customProxyType}
          customProxyHost={customProxyHost}
          customProxyPort={customProxyPort}
        />
      </div>

      {/* Rodapé Fixo */}
      <ImportFooter
        totalCount={parsedProfiles.length}
        isImporting={isImporting}
        onImport={handleImport}
        onCancel={() => navigate('/perfis')}
      />
    </div>
  );
};

export default ImportarPerfilPage;
