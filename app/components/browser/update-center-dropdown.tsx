import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useBrowser } from '../../contexts/browser-context';
import { appUpdateService, AppReleaseInfo, CURRENT_APP_VERSION } from '../../services/app-update/service.update';
import { toast } from '../ui/notification';

export const UpdateCenterDropdown: React.FC = () => {
  const {
    status,
    isDownloading,
    progress,
    stage,
    speedMbS,
    etaSeconds,
    startDownload,
    checkStatus,
  } = useBrowser();

  const [isOpen, setIsOpen] = useState(false);
  const [appRelease, setAppRelease] = useState<AppReleaseInfo | null>(null);
  const [isCheckingApp, setIsCheckingApp] = useState(false);
  const [hasCheckedApp, setHasCheckedApp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isInstalled = status?.health.status === 'installed';
  const isMissing = status?.health.status === 'missing' || status?.health.status === 'broken';

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Checa versão do aplicativo quando abrir
  const handleCheckAppUpdate = async () => {
    setIsCheckingApp(true);
    try {
      const release = await appUpdateService.checkForAppUpdate();
      setAppRelease(release);
      setHasCheckedApp(true);
      if (release?.hasUpdate) {
        toast.info(`Nova versão do Fury disponível: ${release.tagName}`);
      } else {
        toast.success(`Você está utilizando a versão mais recente (v${CURRENT_APP_VERSION})`);
      }
    } catch {
      toast.error('Não foi possível verificar atualizações no momento.');
    } finally {
      setIsCheckingApp(false);
    }
  };

  const handleDownloadAll = () => {
    if (isMissing && !isDownloading) {
      startDownload();
      toast.info('Iniciando download do motor Fury...');
    } else if (isDownloading) {
      toast.info(`Download em andamento: ${Math.round(progress)}%`);
    } else {
      checkStatus();
      handleCheckAppUpdate();
    }
  };

  const getStageDisplay = () => {
    switch (stage) {
      case 'connecting':
        return 'Conectando ao servidor...';
      case 'downloading':
        return `Baixando motor (${Math.round(progress)}%)`;
      case 'extracting':
        return `Extraindo arquivos (${Math.round(progress)}%)`;
      case 'finalizing':
        return 'Finalizando instalação...';
      case 'ready':
        return 'Instalação concluída!';
      default:
        return 'Processando...';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botão Principal no Header (Estilo Imagem 1) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none overflow-hidden ${
          isDownloading
            ? 'bg-[#15161D] text-[#F4F4F6] border-emerald-500/40 shadow-xs shadow-emerald-500/10'
            : isInstalled
            ? 'bg-[#15161D] hover:bg-[#1E2028] text-[#E5E7EB] hover:text-white border-[#2B2D38] hover:border-[#3E404D]'
            : 'bg-[#15161D] hover:bg-[#1E2028] text-[#F4F4F6] border-amber-500/40 hover:border-amber-500/60'
        }`}
        title={
          isDownloading
            ? `Baixando motor Fury: ${Math.round(progress)}%`
            : isInstalled
            ? 'Motor Fury instalado e pronto'
            : 'Motor Fury pendente. Clique para gerenciar.'
        }
      >
        {isDownloading ? (
          <>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
            <span className="font-semibold text-emerald-400">
              Motor Fury ({Math.round(progress)}%)
            </span>
          </>
        ) : isInstalled ? (
          <>
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Motor Fury</span>
          </>
        ) : (
          <>
            <ShieldAlert size={14} className="text-amber-400 shrink-0" />
            <span>Motor Fury</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
          </>
        )}

        {/* Linha discreta de progresso no botão ao baixar */}
        {isDownloading && (
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
      </button>

      {/* Dropdown Popover: Central de Atualizações (Estilo Imagem 2) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-84 rounded-xl bg-[#1A1C24] border border-[#2B2D38] shadow-2xl shadow-black/80 z-50 overflow-visible animate-in fade-in zoom-in-95 duration-150">
          {/* Seta indicadora (caret) apontando para o botão */}
          <div className="absolute -top-1.5 right-6 w-3 h-3 bg-[#1A1C24] border-t border-l border-[#2B2D38] rotate-45 z-10" />

          {/* Cabeçalho do Popover */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B2D38]/70">
            <span className="text-[13px] font-semibold text-[#F4F4F6] tracking-tight">
              Central de Atualizações
            </span>
            <button
              type="button"
              onClick={handleDownloadAll}
              className="text-xs text-[#3b82f6] hover:text-[#60a5fa] font-medium transition-colors cursor-pointer"
            >
              {isMissing && !isDownloading ? 'Baixar tudo' : 'Verificar'}
            </button>
          </div>

          {/* Corpo do Popover */}
          <div className="p-3">
            {/* Caso 1: Motor Baixando no momento (visão discreta, sem detalhes excessivos) */}
            {isDownloading && (
              <div className="rounded-lg bg-[#14151C] border border-[#2B2D38] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-[#F4F4F6]">
                      Motor Fury (v2.0.0)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {Math.round(progress)}%
                  </span>
                </div>

                {/* Barra de progresso fina e elegante */}
                <div className="w-full bg-[#2B2D38] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8E92A2]">
                  <span>{getStageDisplay()}</span>
                  {speedMbS > 0 && (
                    <span className="font-mono">{speedMbS.toFixed(1)} MB/s</span>
                  )}
                </div>
              </div>
            )}

            {/* Caso 2: Motor Ausente ou Quebrado (Necessita Download) */}
            {!isDownloading && isMissing && (
              <div className="rounded-lg bg-[#14151C] border border-amber-500/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-[#F4F4F6]">
                        Motor Fury (v2.0.0)
                      </div>
                      <div className="text-[10.5px] text-[#8E92A2]">
                        Instalação pendente para navegação
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startDownload()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Caso 3: Motor Instalado e Sem Downloads Ativos (Estado Normal da Imagem 2) */}
            {!isDownloading && !isMissing && !appRelease?.hasUpdate && (
              <div className="py-9 flex flex-col items-center justify-center text-center select-none">
                <span className="text-xs text-[#6B7280]">
                  Sem novas notificações
                </span>
              </div>
            )}

            {/* Caso 4: Nova Versão do Aplicativo Fury Desktop Disponível */}
            {appRelease?.hasUpdate && (
              <div className="rounded-lg bg-[#14151C] border border-blue-500/30 p-3 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Nova versão {appRelease.tagName} disponível!
                    </div>
                    <div className="text-[10.5px] text-[#8E92A2]">
                      Versão atual: v{CURRENT_APP_VERSION}
                    </div>
                  </div>
                  {appRelease.downloadUrl && (
                    <a
                      href={appRelease.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                    >
                      <Download size={12} />
                      <span>Atualizar</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé discreto com informações do App */}
          <div className="px-4 py-2.5 bg-[#14151C]/60 border-t border-[#2B2D38]/60 flex items-center justify-between text-[10.5px] text-[#6B7280]">
            <span>Fury Desktop v{CURRENT_APP_VERSION}</span>
            <button
              type="button"
              onClick={handleCheckAppUpdate}
              disabled={isCheckingApp}
              className="flex items-center gap-1 text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={10} className={isCheckingApp ? 'animate-spin' : ''} />
              <span>{isCheckingApp ? 'Verificando...' : 'Checar updates'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateCenterDropdown;
