import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useBrowser } from '../../contexts/browser-context';
import { appUpdateService, AppReleaseInfo, CURRENT_APP_VERSION } from '../../services/app-update/service.update';
import { toast } from '../ui/notification';

export const UpdateCenterDropdown: React.FC = () => {
  const {
    status,
    isDownloading: isEngineDownloading,
    progress: engineProgress,
    speedMbS: engineSpeed,
    startDownload: startEngineDownload,
    checkStatus: checkEngineStatus,
  } = useBrowser();

  const [isOpen, setIsOpen] = useState(false);
  const [appRelease, setAppRelease] = useState<AppReleaseInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estados de download do aplicativo
  const [appProgress, setAppProgress] = useState(0);
  const [appSpeed, setAppSpeed] = useState(0);
  const [appDownloadedMb, setAppDownloadedMb] = useState(0);
  const [appTotalMb, setAppTotalMb] = useState(0);
  const [isAppDownloading, setIsAppDownloading] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const isEngineInstalled = status?.health.status === 'installed';
  const isEngineMissing = status?.health.status === 'missing' || status?.health.status === 'broken';
  const isEngineUpdateAvailable = status?.has_update ?? false;
  const hasPending = isEngineMissing || isEngineUpdateAvailable || !!appRelease?.hasUpdate || isAppReady;

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Consulta ao abrir
  useEffect(() => {
    if (isOpen) {
      checkEngineStatus();
      handleCheckApp();
    }
  }, [isOpen]);

  const handleCheckApp = async () => {
    setIsChecking(true);
    try {
      const release = await appUpdateService.checkForAppUpdate();
      setAppRelease(release);
      if (release?.hasUpdate) {
        toast.info(`Nova versão disponível: ${release.tagName}`);
      } else {
        toast.success(`Star Multlogin está na versão mais recente (v${CURRENT_APP_VERSION})`);
      }
    } catch {
      toast.error('Não foi possível verificar atualizações.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartAppDownload = async () => {
    if (!appRelease?.downloadUrl || !appRelease?.assetName) {
      toast.error('Nenhum pacote compatível encontrado para download.');
      return;
    }

    setIsAppDownloading(true);
    setAppProgress(0);

    const res = await appUpdateService.startDownload(
      (st) => {
        setAppProgress(st.progress);
        setAppSpeed(st.speed_mb_s);
        setAppDownloadedMb(st.downloaded_bytes / (1024 * 1024));
        setAppTotalMb(st.total_bytes / (1024 * 1024));

        if (st.stage === 'ready' || st.progress >= 100) {
          setIsAppDownloading(false);
          setIsAppReady(true);
          toast.success('Download da atualização concluído!');
        } else if (st.stage === 'error') {
          setIsAppDownloading(false);
          toast.error(st.error || 'Erro no download.');
        }
      },
      { url: appRelease.downloadUrl, name: appRelease.assetName }
    );

    if (!res.success) {
      setIsAppDownloading(false);
      toast.error(res.message);
    }
  };

  const handleApplyRestart = async () => {
    setIsRestarting(true);
    toast.info('Instalando atualização e reiniciando...');
    const res = await appUpdateService.applyRestart();
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
      setIsRestarting(false);
    }
  };

  return (
    <div className={`relative inline-block text-left ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      {/* Botão no Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none ${
          isEngineDownloading || isAppDownloading
            ? 'bg-[#14151B] text-[#00FF66] border-[#00FF66]/40 shadow-xs'
            : isAppReady
              ? 'bg-[#14151B] text-[#00FF66] border-[#00FF66]/60 shadow-xs'
              : hasPending
                ? 'bg-[#14151B] text-[#F4F4F6] border-amber-500/40'
                : 'bg-[#14151B] hover:bg-[#181920] text-[#E5E7EB] border-[#22242F]'
        }`}
      >
        {isEngineDownloading || isAppDownloading ? (
          <>
            <RefreshCw size={13} className="text-[#00FF66] animate-spin shrink-0" />
            <span className="font-semibold text-[#00FF66]">
              {isAppDownloading ? `Atualizando App (${Math.round(appProgress)}%)` : `Motor (${Math.round(engineProgress)}%)`}
            </span>
          </>
        ) : isAppReady ? (
          <>
            <CheckCircle2 size={13} className="text-[#00FF66] shrink-0" />
            <span className="font-semibold text-[#00FF66]">Reiniciar App</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse ml-0.5" />
          </>
        ) : (
          <>
            <RefreshCw size={13} className={hasPending ? 'text-amber-400 shrink-0' : 'text-[#8E92A2] shrink-0'} />
            <span>Atualização</span>
            {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />}
          </>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[390px] rounded-xl bg-[#14151B] border border-[#22242F] shadow-2xl shadow-black/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Top Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#22242F]">
            <span className="text-xs font-bold text-white tracking-wide">Central de Atualizações</span>
            <button
              type="button"
              onClick={() => { checkEngineStatus(); handleCheckApp(); }}
              disabled={isChecking || isAppDownloading}
              className="flex items-center gap-1.5 text-xs text-[#00FF66] hover:text-[#00D655] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={11} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'Verificando...' : 'Verificar'}</span>
            </button>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Bloco 1: Motor One Star */}
            <div className="rounded-lg bg-[#0F1015] border border-[#22242F] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isEngineInstalled ? 'bg-[#00FF66]' : 'bg-amber-400'}`} />
                  <span className="text-xs font-semibold text-white">Motor One Star</span>
                </div>
                <span className="text-[11px] text-[#8E92A2] font-mono">
                  {status?.health.status === 'installed' && 'version' in status.health ? status.health.version : status?.available_version || 'v2.0.0'}
                </span>
              </div>

              {isEngineDownloading ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10.5px] text-[#8E92A2]">
                    <span>Baixando motor ({Math.round(engineProgress)}%)</span>
                    <span>{engineSpeed.toFixed(1)} MB/s</span>
                  </div>
                  <div className="w-full bg-[#1A1C24] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#00FF66] h-full transition-all duration-200" style={{ width: `${engineProgress}%` }} />
                  </div>
                </div>
              ) : isEngineMissing || isEngineUpdateAvailable ? (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#8E92A2]">
                    {isEngineMissing ? 'Instalação pendente' : 'Nova versão disponível'}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEngineDownload()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00FF66] hover:bg-[#00D655] text-black text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Download size={11} strokeWidth={2.5} />
                    <span>{isEngineMissing ? 'Baixar Motor' : 'Atualizar'}</span>
                  </button>
                </div>
              ) : (
                <div className="text-[10.5px] text-[#00FF66] flex items-center gap-1 pt-0.5">
                  <CheckCircle2 size={11} />
                  <span>Motor instalado e em dia.</span>
                </div>
              )}
            </div>

            {/* Bloco 2: Aplicativo Star Multlogin */}
            {appRelease?.hasUpdate ? (
              <div className="rounded-lg bg-[#0F1015] border border-[#00FF66]/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Nova versão {appRelease.tagName} disponível</span>
                    <span className="text-[11px] text-[#8E92A2] block mt-0.5">
                      Versão atual: v{CURRENT_APP_VERSION}
                    </span>
                  </div>

                  {!isAppDownloading && !isAppReady && (
                    <button
                      type="button"
                      onClick={handleStartAppDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00FF66] hover:bg-[#00D655] text-black text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Download size={12} strokeWidth={2.5} />
                      <span>Baixar</span>
                    </button>
                  )}

                  {isAppReady && (
                    <button
                      type="button"
                      onClick={handleApplyRestart}
                      disabled={isRestarting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00FF66] hover:bg-[#00D655] text-black text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} strokeWidth={2.5} />
                      <span>{isRestarting ? 'Reiniciando...' : 'Reiniciar App'}</span>
                    </button>
                  )}
                </div>

                {isAppDownloading && (
                  <div className="space-y-1.5 pt-1.5 border-t border-[#22242F]">
                    <div className="flex justify-between text-[10.5px] text-[#8E92A2]">
                      <span>{appDownloadedMb.toFixed(1)} MB / {appTotalMb.toFixed(1)} MB ({appSpeed.toFixed(1)} MB/s)</span>
                      <span className="text-[#00FF66] font-mono font-bold">{Math.round(appProgress)}%</span>
                    </div>
                    <div className="w-full bg-[#1A1C24] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00FF66] h-full transition-all duration-200" style={{ width: `${appProgress}%` }} />
                    </div>
                  </div>
                )}

                {isAppReady && (
                  <div className="text-[10.5px] text-[#00FF66] flex items-center gap-1 pt-1 border-t border-[#22242F]">
                    <CheckCircle2 size={11} />
                    <span>Download concluído! Clique no botão para aplicar e reiniciar.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-[#0F1015] border border-[#22242F] p-3 text-center py-4 space-y-1">
                <CheckCircle2 size={18} className="text-[#00FF66] mx-auto mb-1" />
                <span className="text-xs font-semibold text-white block">Aplicativo Atualizado</span>
                <span className="text-[11px] text-[#8E92A2] block">Você está usando a versão v{CURRENT_APP_VERSION}.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateCenterDropdown;
