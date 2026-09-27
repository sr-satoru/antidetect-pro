import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  browserService,
  BrowserStatusResponse,
} from '../services/browser/service.browser';
import { toast } from '../components/ui/notification';

interface BrowserContextType {
  status: BrowserStatusResponse | null;
  isDownloading: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  progress: number;
  stage: string;
  speedMbS: number;
  etaSeconds: number;
  downloadedBytes: number;
  totalBytes: number;
  error: string | null;
  checkStatus: () => Promise<BrowserStatusResponse | null>;
  startDownload: () => Promise<void>;
}

const BrowserContext = createContext<BrowserContextType | undefined>(undefined);

export const BrowserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<BrowserStatusResponse | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle');
  const [speedMbS, setSpeedMbS] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hasAutoStartedRef = useRef(false);

  const checkStatus = useCallback(async (): Promise<BrowserStatusResponse | null> => {
    try {
      const data = await browserService.getStatus();
      setStatus(data);

      if (data.download.is_downloading) {
        setIsDownloading(true);
        setStage(data.download.stage);
        setProgress(data.download.progress);
        setSpeedMbS(data.download.speed_mb_s);
        setEtaSeconds(data.download.eta_seconds);
        setDownloadedBytes(data.download.downloaded_bytes);
        setTotalBytes(data.download.total_bytes);
        if (data.download.error) {
          setError(data.download.error);
        }
      }

      return data;
    } catch (err) {
      console.warn('Backend Fury offline ou inacessível ao verificar status do motor:', err);
      return null;
    }
  }, []);

  const startDownload = useCallback(async () => {
    setError(null);
    setIsDownloading(true);
    setStage('connecting');
    setProgress(0);
    setIsModalOpen(true);

    try {
      const res = await browserService.triggerDownload();
      if (!res.success) {
        setError(res.message);
        setIsDownloading(false);
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err?.message || 'Falha ao iniciar o download do motor.';
      setError(msg);
      setIsDownloading(false);
      toast.error(msg);
    }
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // WebSocket para receber o progresso de download em tempo real (zero polling)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isDisposed = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        const wsUrl = 'ws://127.0.0.1:8000/api/ws';
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.event === 'browser_download_progress' && parsed.data) {
              const d = parsed.data;
              setStage(d.stage);
              setProgress(d.progress ?? 0);
              setDownloadedBytes(d.downloaded_bytes ?? 0);
              setTotalBytes(d.total_bytes ?? 0);
              setSpeedMbS(d.speed_mb_s ?? 0);
              setEtaSeconds(d.eta_seconds ?? 0);

              if (d.stage === 'downloading' || d.stage === 'extracting' || d.stage === 'finalizing' || d.stage === 'connecting') {
                setIsDownloading(true);
              }

              if (d.stage === 'ready') {
                setIsDownloading(false);
                setProgress(100);
                toast.success('Motor Fury instalado e verificado com sucesso!');
                checkStatus();
              }

              if (d.stage === 'error') {
                setIsDownloading(false);
                setError(d.error || 'Erro desconhecido durante o download.');
                toast.error(d.error || 'Falha no download do motor.');
                checkStatus();
              }
            }
          } catch (e) {
            console.error('Erro ao ler mensagem WebSocket no BrowserContext:', e);
          }
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWs, 2500);
          }
        };
      } catch (err) {
        console.warn('Erro ao conectar WebSocket do motor:', err);
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [checkStatus]);

  // Checagem inicial na inicialização da aplicação: se ausente ou quebrado, dispara automaticamente
  useEffect(() => {
    const initCheck = async () => {
      const data = await checkStatus();
      if (!data) return;

      if (
        !hasAutoStartedRef.current &&
        (data.health.status === 'missing' || data.health.status === 'broken')
      ) {
        hasAutoStartedRef.current = true;
        console.log(
          '🔍 Motor Fury ausente ou corrompido detectado. Iniciando download automático...'
        );
        setIsModalOpen(true);
        startDownload();
      }
    };

    initCheck();
  }, [checkStatus, startDownload]);

  return (
    <BrowserContext.Provider
      value={{
        status,
        isDownloading,
        isModalOpen,
        openModal,
        closeModal,
        progress,
        stage,
        speedMbS,
        etaSeconds,
        downloadedBytes,
        totalBytes,
        error,
        checkStatus,
        startDownload,
      }}
    >
      {children}
    </BrowserContext.Provider>
  );
};

export const useBrowser = (): BrowserContextType => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowser deve ser utilizado dentro de um BrowserProvider');
  }
  return context;
};
