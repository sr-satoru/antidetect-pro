// SPDX-License-Identifier: MIT OR Apache-2.0
// Central de Atualizações - Ultra-Minimalista

import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Check, WifiOff, X } from 'lucide-react';
import { useBrowser } from '../../contexts/browser-context';
import {
  appUpdateService,
  AppReleaseInfo,
  CURRENT_APP_VERSION,
} from '../../services/app-update/service.update';
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
  const currentSpeed = isAppDownloading ? appSpeed : download.speedMbS;

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const handleUpdateAll = async () => {
    if (isUpdating) return;

    if (hasPendingEngines) {
      await startUpdate();
    }

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
            toast.success('Atualização do aplicativo baixada com sucesso!');
          } else if (st.stage === 'error') {
            setIsAppDownloading(false);
            toast.error(st.error || 'Erro no download da atualização do app.');
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
    toast.info('Aplicando atualização e reiniciando o Star Multilogin...');
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
      {/* Botão no Header (Clean, compacto e alinhado) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-1.5 h-8.5 px-3 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer select-none active:scale-[0.98] shadow-2xs ${
          isUpdating
            ? 'bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA] border-[#7C3AED]/30 dark:border-[#7C3AED]/40'
            : isAppReady
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/40'
              : isOffline
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 dark:border-rose-500/40'
                : hasAnyUpdate
                  ? 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/40'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#1F2026] dark:hover:bg-[#282A33] text-slate-600 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-[#2D3039]'
        }`}
        title="Central de Atualizações"
      >
        {isUpdating ? (
          <>
            <RefreshCw size={12} className="text-[#7C3AED] dark:text-[#A78BFA] animate-spin shrink-0" />
            <span className="font-medium tabular-nums">
              Atualizando {Math.round(currentProgress)}%
            </span>
          </>
        ) : isAppReady ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">Reiniciar App</span>
          </>
        ) : isOffline ? (
          <>
            <WifiOff size={12} className="text-rose-500 shrink-0" />
            <span>Offline</span>
          </>
        ) : hasAnyUpdate ? (
          <>
            <Download size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium">Atualização</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-[#9DA2B4]">Atualizado</span>
          </>
        )}
      </button>

      {/* Popover Ultra-Minimalista */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Central de Atualizações"
          className="absolute right-0 top-full mt-2 w-[310px] sm:w-[330px] rounded-2xl bg-white dark:bg-[#18191E] border border-slate-200 dark:border-[#2D3039] shadow-dropdown shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none text-left p-4 space-y-3.5"
        >
          {/* Header simples */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-[#252733]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#717684]">
              Atualizações
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isChecking || isUpdating}
                onClick={handleCheckAll}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-700 dark:text-[#82889A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252733] transition-colors cursor-pointer disabled:opacity-50"
                title="Checar novamente"
              >
                <RefreshCw size={11} className={isChecking ? 'animate-spin' : ''} />
                <span>{isChecking ? 'Checando...' : 'Verificar'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-[#82889A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252733] transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Conteúdo Dinâmico Baseado no Estado */}
          {isUpdating ? (
            /* Estado 1: Em download / atualizando */
            <div className="py-1 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-[#E2E4EC] flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]" />
                  {isAppDownloading ? 'Baixando aplicativo...' : 'Baixando motores...'}
                </span>
                <span className="font-mono font-semibold text-[#7C3AED] dark:text-[#A78BFA]">
                  {Math.round(currentProgress)}%
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-[#252733] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#7C3AED] h-full transition-all duration-150 rounded-full"
                  style={{ width: `${Math.max(4, Math.min(100, currentProgress))}%` }}
                />
              </div>

              {currentSpeed > 0 && (
                <span className="block text-right font-mono text-[10px] text-slate-400 dark:text-[#82889A]">
                  {currentSpeed.toFixed(1)} MB/s
                </span>
              )}
            </div>
          ) : isAppReady ? (
            /* Estado 2: Download concluído, pronto para reiniciar */
            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Atualização pronta para instalação</span>
              </div>

              <button
                type="button"
                onClick={handleApplyRestart}
                disabled={isRestarting}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw size={13} className={isRestarting ? 'animate-spin' : ''} />
                <span>{isRestarting ? 'Reiniciando...' : 'Reiniciar e Aplicar'}</span>
              </button>
            </div>
          ) : hasAnyUpdate ? (
            /* Estado 3: Há atualização disponível */
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Atualização disponível</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#8A8F9F] pl-4">
                  {hasAppUpdate && appRelease?.tagName
                    ? `Nova versão ${appRelease.tagName} disponível para instalação.`
                    : 'Novos motores de navegação prontos para baixar.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleUpdateAll}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium text-xs transition-all active:scale-[0.98] cursor-pointer shadow-xs shadow-[#7C3AED]/20"
              >
                <Download size={13} />
                <span>Clique para atualizar</span>
              </button>
            </div>
          ) : (
            /* Estado 4: Tudo atualizado */
            <div className="py-3 text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-0.5">
                <Check size={16} />
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Nenhuma atualização disponível
              </p>
              <p className="text-[11px] text-slate-500 dark:text-[#8A8F9F]">
                O Star Multilogin está em dia (v{CURRENT_APP_VERSION})
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UpdateCenterDropdown;
