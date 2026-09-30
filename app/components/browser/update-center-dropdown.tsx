import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  RefreshCw,
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

  // Estados dedicados exclusivamente para a animação do progresso de atualização do app
  const [appProgress, setAppProgress] = useState(0);
  const [appSpeedMbS, setAppSpeedMbS] = useState(0);
  const [appEtaSeconds, setAppEtaSeconds] = useState(0);
  const [appStage, setAppStage] = useState('idle');
  const [isAppDownloading, setIsAppDownloading] = useState(false);
  const [isAppReadyToRestart, setIsAppReadyToRestart] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const isInstalled = status?.health.status === 'installed';
  const isMissing = status?.health.status === 'missing' || status?.health.status === 'broken';
  const hasAnyUpdatePending = isMissing || !!appRelease?.hasUpdate || isAppReadyToRestart;

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
        toast.info(`Nova versão do One Star Multilogin disponível: ${release.tagName}`);
      } else {
        toast.success(`Você está utilizando a versão mais recente (v${CURRENT_APP_VERSION})`);
      }
    } catch {
      toast.error('Não foi possível verificar atualizações no momento.');
    } finally {
      setIsCheckingApp(false);
    }
  };

  const handleStartAppDownload = async () => {
    setIsAppDownloading(true);
    setAppProgress(0);
    setAppStage('downloading');

    const res = await appUpdateService.startDownload((progressPercent) => {
      setAppProgress(Math.round(progressPercent));
      if (progressPercent >= 100) {
        setAppStage('ready');
        setIsAppDownloading(false);
        setIsAppReadyToRestart(true);
        toast.success('Atualização baixada com sucesso! Clique em reiniciar para aplicar.');
      }
    });

    if (!res.success) {
      setIsAppDownloading(false);
      toast.error(res.message);
    } else {
      toast.info('Iniciando download nativo pelo Tauri...');
    }
  };

  const handleApplyRestart = async () => {
    setIsRestarting(true);
    toast.info('Reiniciando aplicativo...');
    await appUpdateService.applyRestart();
  };

  const handleDownloadAll = () => {
    if (isMissing && !isDownloading) {
      startDownload();
      toast.info('Iniciando download do motor One Star...');
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
    <div className={`relative inline-block text-left ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      {/* Botão Principal no Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none overflow-hidden ${isDownloading || isAppDownloading
            ? 'bg-[#15161D] text-[#F4F4F6] border-emerald-500/40 shadow-xs shadow-emerald-500/10'
            : isAppReadyToRestart
              ? 'bg-[#15161D] hover:bg-[#1E2028] text-emerald-400 border-emerald-500/50 shadow-xs shadow-emerald-500/20'
              : hasAnyUpdatePending
                ? 'bg-[#15161D] hover:bg-[#1E2028] text-[#F4F4F6] border-amber-500/40 hover:border-amber-500/60'
                : 'bg-[#15161D] hover:bg-[#1E2028] text-[#E5E7EB] hover:text-white border-[#2B2D38] hover:border-[#3E404D]'
          }`}
        title={
          isAppDownloading
            ? `Baixando atualização do Star Multlogin: ${Math.round(appProgress)}%`
            : isDownloading
              ? `Baixando motor: ${Math.round(progress)}%`
              : isAppReadyToRestart
                ? 'Atualização concluída! Clique para reiniciar.'
                : hasAnyUpdatePending
                  ? 'Atualização pendente. Clique para gerenciar.'
                  : 'Atualização do sistema. Clique para gerenciar.'
        }
      >
        {isDownloading || isAppDownloading ? (
          <>
            <RefreshCw size={13} className="text-emerald-400 animate-spin shrink-0" />
            <span className="font-semibold text-emerald-400">
              {isAppDownloading ? `Atualizando App (${Math.round(appProgress)}%)` : `Atualizando Motor (${Math.round(progress)}%)`}
            </span>
          </>
        ) : isAppReadyToRestart ? (
          <>
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-400">Reiniciar App</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </>
        ) : hasAnyUpdatePending ? (
          <>
            <RefreshCw size={13} className="text-amber-400 shrink-0" />
            <span>Atualização</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
          </>
        ) : (
          <>
            <RefreshCw size={13} className="text-emerald-400 shrink-0" />
            <span>Atualização</span>
          </>
        )}

        {/* Linha discreta de progresso no botão ao baixar */}
        {(isDownloading || isAppDownloading) && (
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${isAppDownloading ? appProgress : progress}%` }}
          />
        )}
      </button>

      {/* Dropdown Popover: Central de Atualizações */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[420px] rounded-xl bg-[#1A1C24] border border-[#2B2D38] shadow-2xl shadow-black/80 z-50 overflow-visible animate-in fade-in zoom-in-95 duration-150">
          {/* Seta indicadora (caret) apontando para o botão */}
          <div className="absolute -top-1.5 right-6 w-3 h-3 bg-[#1A1C24] border-t border-l border-[#2B2D38] rotate-45 z-10" />

          {/* Cabeçalho do Popover */}
          <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-[#2B2D38]/70">
            <span className="text-[13px] font-semibold text-[#F4F4F6] tracking-tight">
              Central de Atualizações
            </span>
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={isCheckingApp || isAppDownloading}
              className="flex items-center gap-1.5 text-xs text-[#3b82f6] hover:text-[#60a5fa] font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={11} className={isCheckingApp ? 'animate-spin' : ''} />
              <span>{isMissing && !isDownloading ? 'Baixar motor' : isCheckingApp ? 'Verificando...' : 'Verificar'}</span>
            </button>
          </div>

          {/* Corpo do Popover */}
          <div className="p-4 space-y-3">
            {/* Caso 1: Motor Baixando no momento */}
            {isDownloading && (
              <div className="rounded-xl bg-[#14151C] border border-[#2B2D38] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="text-xs font-semibold text-[#F4F4F6] block">
                        Motor One Star (v2.0.0)
                      </span>
                      <span className="text-[11px] text-[#8E92A2] block mt-0.5">
                        {getStageDisplay()}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="w-full bg-[#2B2D38] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {speedMbS > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-[#8E92A2]">
                    <span>Velocidade de transferência</span>
                    <span className="font-mono text-[#D2D5DF]">{speedMbS.toFixed(1)} MB/s</span>
                  </div>
                )}
              </div>
            )}

            {/* Caso 2: Motor Ausente ou Quebrado */}
            {!isDownloading && isMissing && (
              <div className="rounded-xl bg-[#14151C] border border-amber-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                      <Download size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#F4F4F6]">
                        Motor One Star (v2.0.0)
                      </div>
                      <div className="text-[11px] text-[#8E92A2] mt-0.5 leading-relaxed">
                        Instalação pendente para navegação e inicialização de perfis.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startDownload()}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1D24] border border-white/30 hover:border-white text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Download size={13} />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Caso 3: Motor Instalado e Sem Downloads Ativos */}
            {!isDownloading && !isMissing && !appRelease?.hasUpdate && !isAppReadyToRestart && (
              <div className="py-10 px-4 flex flex-col items-center justify-center text-center select-none space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-xs font-semibold text-[#F4F4F6]">
                  Tudo atualizado
                </span>
                <span className="text-[11.5px] text-[#8E92A2] max-w-[280px]">
                  O motor One Star e o aplicativo estão na versão mais recente.
                </span>
              </div>
            )}

            {/* Caso 4: Nova Versão do Aplicativo Star Multlogin com Animação em Tempo Real */}
            {appRelease?.hasUpdate && (
              <div className="rounded-xl bg-[#14151C] border border-blue-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                      <RefreshCw size={16} className={isAppDownloading ? 'animate-spin' : ''} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Nova versão {appRelease.tagName} disponível!
                      </div>
                      <div className="text-[11px] text-[#8E92A2] mt-0.5">
                        Versão atual: v{CURRENT_APP_VERSION} • {appRelease.platform}
                      </div>
                    </div>
                  </div>

                  {!isAppDownloading && !isAppReadyToRestart && (
                    <button
                      type="button"
                      onClick={handleStartAppDownload}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Atualizar</span>
                    </button>
                  )}

                  {isAppReadyToRestart && (
                    <button
                      type="button"
                      onClick={handleApplyRestart}
                      disabled={isRestarting}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isRestarting ? 'animate-spin' : ''} />
                      <span>{isRestarting ? 'Reiniciando...' : 'Reiniciar Agora'}</span>
                    </button>
                  )}
                </div>

                {/* Animação e Barra de Progresso em Tempo Real (alimentada pelo WebSocket dedicado do Rust) */}
                {isAppDownloading && (
                  <div className="space-y-2 pt-2 border-t border-[#2B2D38]/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8E92A2]">
                        {appStage === 'connecting'
                          ? 'Conectando ao repositório...'
                          : appSpeedMbS > 0
                            ? `${appSpeedMbS.toFixed(1)} MB/s • ${appEtaSeconds}s restantes`
                            : 'Baixando atualização...'}
                      </span>
                      <span className="font-mono font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {Math.round(appProgress)}%
                      </span>
                    </div>

                    <div className="w-full bg-[#2B2D38] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${appProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {isAppReadyToRestart && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 size={13} />
                    <span>Download concluído! Clique em reiniciar para aplicar a nova versão.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateCenterDropdown;
