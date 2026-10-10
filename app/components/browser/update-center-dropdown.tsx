import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import { useBrowser } from '../../contexts/browser-context';
import { appUpdateService, AppReleaseInfo, CURRENT_APP_VERSION } from '../../services/app-update/service.update';
import { toast } from '../ui/notification';

export const UpdateCenterDropdown: React.FC = () => {
  const {
    status,
    download,
    isDownloading: isEngineDownloading,
    isOffline,
    startUpdate,
    checkStatus,
  } = useBrowser();

  const [isOpen, setIsOpen] = useState(false);
  const [appRelease, setAppRelease] = useState<AppReleaseInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estados de download do aplicativo Desktop
  const [appProgress, setAppProgress] = useState(0);
  const [appSpeed, setAppSpeed] = useState(0);
  const [isAppDownloading, setIsAppDownloading] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const isClearcoteInstalled = status?.health_clearcote?.status === 'installed';
  const isCamoufoxInstalled = status?.health_camoufox?.status === 'installed';

  const hasPendingEngines = !isClearcoteInstalled || !isCamoufoxInstalled;
  const hasAppUpdate = !!appRelease?.hasUpdate;
  const hasAnyUpdate = hasPendingEngines || hasAppUpdate;

  const isUpdating = isEngineDownloading || isAppDownloading;

  const currentProgress = isAppDownloading ? appProgress : download.progress;

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

  const handleCheckAll = async () => {
    setIsChecking(true);
    try {
      await checkStatus();
      const release = await appUpdateService.checkForAppUpdate();
      setAppRelease(release);
    } catch (e) {
      console.warn('Erro ao verificar atualizações:', e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleCheckAll();
    }
  }, [isOpen]);

  // Função central: 1 CLIQUE e o sistema faz todo o resto
  const handleUpdateAll = async () => {
    if (isUpdating) return;

    // 1. Se houver motores pendentes, o backend baixa e configura tudo sozinho
    if (hasPendingEngines) {
      await startUpdate();
    }

    // 2. Se houver atualização do aplicativo desktop
    if (hasAppUpdate && appRelease?.downloadUrl && appRelease?.assetName) {
      setIsAppDownloading(true);
      setAppProgress(0);
      const res = await appUpdateService.startDownload(
        (st) => {
          setAppProgress(st.progress);
          setAppSpeed(st.speed_mb_s);
          if (st.stage === 'ready' || st.progress >= 100) {
            setIsAppDownloading(false);
            setIsAppReady(true);
            toast.success('Atualização do aplicativo baixada!');
          } else if (st.stage === 'error') {
            setIsAppDownloading(false);
            toast.error(st.error || 'Erro no download do app.');
          }
        },
        { url: appRelease.downloadUrl, name: appRelease.assetName }
      );
      if (!res.success) {
        setIsAppDownloading(false);
        toast.error(res.message);
      }
    }
  };

  const handleApplyRestart = async () => {
    setIsRestarting(true);
    toast.info('Aplicando atualização e reiniciando...');
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
      {/* Botão no Header com progresso embutido */}
      <button
        type="button"
        onClick={() => {
          // Se houver update pendente e não estiver aberto, abre para visualização ou o usuário atualiza direto
          setIsOpen(!isOpen);
        }}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-xs select-none ${
          isUpdating
            ? 'bg-emerald-50 text-emerald-700 border-emerald-500/50 dark:bg-[#14151B] dark:text-[#00FF66] dark:border-[#00FF66]/50'
            : isAppReady
              ? 'bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-[#14151B] dark:text-[#00FF66] dark:border-[#00FF66]/70'
              : hasAnyUpdate
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 dark:border-amber-500/40'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#14151B] dark:hover:bg-[#181920] dark:text-[#E5E7EB] dark:border-[#22242F]'
        }`}
      >
        {isUpdating ? (
          <>
            <RefreshCw size={13} className="text-emerald-600 dark:text-[#00FF66] animate-spin shrink-0" />
            <span>Atualizando ({Math.round(currentProgress)}%)</span>
          </>
        ) : isAppReady ? (
          <>
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-[#00FF66] shrink-0" />
            <span>Reiniciar App</span>
          </>
        ) : isOffline ? (
          <>
            <WifiOff size={13} className="text-rose-500 shrink-0" />
            <span>Offline</span>
          </>
        ) : hasAnyUpdate ? (
          <>
            <Download size={13} strokeWidth={2.5} className="shrink-0 animate-bounce" />
            <span>Atualizar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-amber-400 animate-pulse ml-0.5" />
          </>
        ) : (
          <>
            <CheckCircle2 size={13} className="text-emerald-500 dark:text-[#00FF66] shrink-0" />
            <span className="text-slate-600 dark:text-[#A0A4B4]">Atualizado</span>
          </>
        )}
      </button>

      {/* Popover Compacto sem Popups Invasivos */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] rounded-2xl bg-white dark:bg-[#14151B] border border-slate-200 dark:border-[#22242F] shadow-xl shadow-black/20 z-50 overflow-hidden animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#22242F] bg-slate-50/70 dark:bg-[#15161D]">
            <span className="text-xs font-bold text-slate-900 dark:text-white">Central de Atualizações</span>
            <button
              type="button"
              disabled={isChecking || isUpdating}
              onClick={handleCheckAll}
              className="text-[11px] text-emerald-600 dark:text-[#00FF66] font-semibold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={10} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'Checando...' : 'Verificar'}</span>
            </button>
          </div>

          <div className="p-4 space-y-3.5">
            {/* Lista Rápida do Status */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#0F1015] border border-slate-200/60 dark:border-[#1E202B]">
                <span className="text-slate-600 dark:text-[#A0A4B4]">App Desktop (v{CURRENT_APP_VERSION})</span>
                {hasAppUpdate ? (
                  <span className="text-amber-500 font-semibold text-[11px]">Nova versão {appRelease?.tagName}</span>
                ) : (
                  <span className="text-emerald-500 font-semibold text-[11px]">Atualizado</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#0F1015] border border-slate-200/60 dark:border-[#1E202B]">
                <span className="text-slate-600 dark:text-[#A0A4B4]">AstroBrowser (Chromium)</span>
                {isClearcoteInstalled ? (
                  <span className="text-emerald-500 font-semibold text-[11px]">Operacional</span>
                ) : (
                  <span className="text-amber-500 font-semibold text-[11px]">Download Pendente</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#0F1015] border border-slate-200/60 dark:border-[#1E202B]">
                <span className="text-slate-600 dark:text-[#A0A4B4]">AstroFox (Firefox)</span>
                {isCamoufoxInstalled ? (
                  <span className="text-emerald-500 font-semibold text-[11px]">Operacional</span>
                ) : (
                  <span className="text-amber-500 font-semibold text-[11px]">Download Pendente</span>
                )}
              </div>
            </div>

            {/* Barra de Progresso quando está atualizando */}
            {isUpdating ? (
              <div className="space-y-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-[#12141D] border border-emerald-500/30 dark:border-[#00FF66]/20">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-medium">
                    {isAppDownloading ? 'Baixando App...' : 'Configurando Motores...'}
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-[#00FF66]">
                    {Math.round(currentProgress)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#1A1C25] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 dark:bg-[#00FF66] h-full transition-all duration-200"
                    style={{ width: `${Math.max(5, currentProgress)}%` }}
                  />
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-[#8E92A2] block text-center">
                  O download continua em segundo plano. Você pode continuar usando o app.
                </span>
              </div>
            ) : isAppReady ? (
              <button
                type="button"
                onClick={handleApplyRestart}
                disabled={isRestarting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00FF66] dark:hover:bg-[#00D655] text-white dark:text-black font-bold text-xs transition-all shadow-md cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isRestarting ? 'Reiniciando...' : 'Reiniciar e Aplicar Atualização'}
              </button>
            ) : hasAnyUpdate ? (
              /* O BOTÃO QUE O USUÁRIO QUER: 1 CLIQUE E FAZ O RESTO */
              <button
                type="button"
                onClick={handleUpdateAll}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00FF66] dark:hover:bg-[#00D655] text-white dark:text-black font-bold text-xs transition-all shadow-md cursor-pointer active:scale-98"
              >
                <Download size={14} strokeWidth={2.5} />
                <span>Atualizar Agora</span>
              </button>
            ) : (
              <div className="text-center py-2 text-xs text-slate-500 dark:text-[#8E92A2]">
                <CheckCircle2 size={18} className="text-emerald-500 mx-auto mb-1" />
                <span>Tudo em dia! Nenhum download necessário.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateCenterDropdown;
