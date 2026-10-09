import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  browserService,
  BrowserStatusResponse,
  EngineVerificationReport,
  AllEnginesVerificationReport,
} from '../services/browser/service.browser';
import { wsService, BrowserDownloadProgressData } from '../services/ws/service.ws';
import { toast } from '../components/ui/notification';

export interface EngineDownloadState {
  isDownloading: boolean;
  engine: string | null;
  stage: string;
  progress: number;
  speedMbS: number;
  etaSeconds: number;
  downloadedBytes: number;
  totalBytes: number;
  error: string | null;
}

const INITIAL_DOWNLOAD_STATE: EngineDownloadState = {
  isDownloading: false,
  engine: null,
  stage: 'idle',
  progress: 0,
  speedMbS: 0,
  etaSeconds: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  error: null,
};

interface BrowserContextType {
  status: BrowserStatusResponse | null;
  download: EngineDownloadState;
  isDownloading: boolean;
  isOffline: boolean;
  isVerifying: boolean;
  lastVerification: Record<string, EngineVerificationReport>;
  checkStatus: () => Promise<BrowserStatusResponse | null>;
  startUpdate: (engine?: 'clearcote' | 'camoufox') => Promise<void>;
  verifyEngines: (engine?: 'clearcote' | 'camoufox') => Promise<void>;
}

const BrowserContext = createContext<BrowserContextType | undefined>(undefined);

export const BrowserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<BrowserStatusResponse | null>(null);
  const [download, setDownload] = useState<EngineDownloadState>(INITIAL_DOWNLOAD_STATE);
  const [isOffline, setIsOffline] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerification, setLastVerification] = useState<Record<string, EngineVerificationReport>>({});

  const checkStatus = useCallback(async (): Promise<BrowserStatusResponse | null> => {
    try {
      const data = await browserService.getStatus();
      setStatus(data);
      setIsOffline(false);

      if (data.download.is_downloading) {
        setDownload({
          isDownloading: true,
          engine: data.download.engine || null,
          stage: data.download.stage,
          progress: data.download.progress,
          speedMbS: data.download.speed_mb_s,
          etaSeconds: data.download.eta_seconds,
          downloadedBytes: data.download.downloaded_bytes,
          totalBytes: data.download.total_bytes,
          error: null,
        });
      } else {
        setDownload((prev) => ({
          ...prev,
          isDownloading: false,
          error: data.download.stage === 'error' ? data.download.error || null : null,
        }));
      }
      return data;
    } catch {
      setIsOffline(true);
      return null;
    }
  }, []);

  const startUpdate = useCallback(async (engine?: 'clearcote' | 'camoufox') => {
    setDownload({
      ...INITIAL_DOWNLOAD_STATE,
      isDownloading: true,
      stage: 'connecting',
      engine: engine || null,
    });

    try {
      const res = await browserService.triggerDownload(engine);
      if (!res.success) {
        setDownload((prev) => ({
          ...prev,
          isDownloading: false,
          stage: 'error',
          error: res.message,
        }));
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err?.message || 'Falha ao iniciar atualização dos motores.';
      setDownload((prev) => ({
        ...prev,
        isDownloading: false,
        stage: 'error',
        error: msg,
      }));
      toast.error(msg);
    }
  }, []);

  const verifyEngines = useCallback(async (engine?: 'clearcote' | 'camoufox') => {
    setIsVerifying(true);
    try {
      const res = await browserService.verifyEngine(engine);
      if (engine) {
        const report = res as EngineVerificationReport;
        setLastVerification((prev) => ({ ...prev, [engine]: report }));
      } else {
        const reports = res as AllEnginesVerificationReport;
        setLastVerification({ clearcote: reports.clearcote, camoufox: reports.camoufox });
      }
      await checkStatus();
      toast.success('Diagnóstico dos motores concluído!');
    } catch (err: any) {
      toast.error(`Falha ao verificar motores: ${err?.message || 'Erro de conexão'}`);
    } finally {
      setIsVerifying(false);
    }
  }, [checkStatus]);

  // WebSocket reativo para eventos de download
  useEffect(() => {
    const unsub = wsService.subscribe<BrowserDownloadProgressData>('browser_download_progress', (d) => {
      if (!d) return;
      const isRunning = d.stage === 'downloading' || d.stage === 'extracting' || d.stage === 'verifying' || d.stage === 'connecting';

      setDownload({
        isDownloading: isRunning,
        engine: (d as any).engine || null,
        stage: d.stage,
        progress: d.progress ?? (d.stage === 'ready' ? 100 : 0),
        downloadedBytes: d.downloaded_bytes ?? 0,
        totalBytes: d.total_bytes ?? 0,
        speedMbS: d.speed_mb_s ?? 0,
        etaSeconds: d.eta_seconds ?? 0,
        error: d.stage === 'error' ? d.error || 'Erro no processo' : null,
      });

      if (d.stage === 'ready') {
        toast.success('Motores de navegação instalados e prontos!');
        checkStatus();
      } else if (d.stage === 'error') {
        toast.error(d.error || 'Falha no download do motor.');
        checkStatus();
      }
    });

    return () => unsub();
  }, [checkStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <BrowserContext.Provider
      value={{
        status,
        download,
        isDownloading: download.isDownloading,
        isOffline,
        isVerifying,
        lastVerification,
        checkStatus,
        startUpdate,
        verifyEngines,
      }}
    >
      {children}
    </BrowserContext.Provider>
  );
};

export const useBrowser = (): BrowserContextType => {
  const ctx = useContext(BrowserContext);
  if (!ctx) throw new Error('useBrowser deve ser utilizado dentro de um BrowserProvider');
  return ctx;
};
