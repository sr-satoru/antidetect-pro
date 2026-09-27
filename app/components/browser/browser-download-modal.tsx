import React from 'react';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  HardDrive,
  X,
  Minus,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useBrowser } from '../../contexts/browser-context';

export const BrowserDownloadModal: React.FC = () => {
  const {
    status,
    isDownloading,
    isModalOpen,
    closeModal,
    progress,
    stage,
    speedMbS,
    etaSeconds,
    downloadedBytes,
    totalBytes,
    error,
    startDownload,
    checkStatus,
  } = useBrowser();

  if (!isModalOpen) return null;

  const isInstalled = status?.health.status === 'installed';
  const isBroken = status?.health.status === 'broken';
  const isMissing = status?.health.status === 'missing';

  const formatBytes = (bytes: number): string => {
    if (bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStageTitle = (currStage: string): string => {
    switch (currStage) {
      case 'connecting':
        return 'Conectando ao repositório oficial...';
      case 'downloading':
        return 'Baixando pacote do motor Camoufox...';
      case 'extracting':
        return 'Descompactando arquivos e bibliotecas...';
      case 'finalizing':
        return 'Isolando executável fury-engine e configurando permissões...';
      case 'ready':
        return 'Motor de navegação pronto para uso!';
      case 'error':
        return 'Falha durante o processo de instalação.';
      default:
        return 'Aguardando início...';
    }
  };

  const getStageStepNumber = (currStage: string): number => {
    switch (currStage) {
      case 'connecting':
        return 1;
      case 'downloading':
        return 2;
      case 'extracting':
        return 3;
      case 'finalizing':
        return 4;
      case 'ready':
        return 5;
      default:
        return 0;
    }
  };

  const currentStep = getStageStepNumber(stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0F1015] border border-[#242633] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-[#1E202B] flex items-center justify-between bg-[#13151D]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#DFE104]/10 text-[#DFE104] border border-[#DFE104]/20">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Motor de Navegação Fury
              </h3>
              <p className="text-[11px] text-[#787C8A]">
                Camoufox v2.0.0 • Binário Oficial Isolado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isDownloading && (
              <button
                type="button"
                onClick={closeModal}
                title="Minimizar (o download continuará em segundo plano)"
                className="p-1.5 rounded-lg text-[#787C8A] hover:text-white hover:bg-[#1E202B] transition-colors"
              >
                <Minus size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={closeModal}
              title="Fechar"
              className="p-1.5 rounded-lg text-[#787C8A] hover:text-white hover:bg-[#1E202B] transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Platform Info Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#151720] border border-[#1E202C]">
            <div className="flex items-center gap-2.5">
              <Cpu size={16} className="text-[#DFE104]" />
              <div>
                <div className="text-xs font-medium text-[#F4F4F6]">
                  {status?.os_name ?? 'Sistema Operacional'}
                </div>
                <div className="text-[11px] font-mono text-[#787C8A]">
                  Chave: {status?.platform ?? 'detectando...'}
                </div>
              </div>
            </div>

            <div className="text-right">
              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck size={11} /> Instalado
                </span>
              ) : isBroken ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle size={11} /> Corrompido
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  <Download size={11} /> Ausente
                </span>
              )}
            </div>
          </div>

          {/* Download in progress state */}
          {isDownloading ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#F4F4F6] flex items-center gap-2">
                  <RefreshCw size={13} className="animate-spin text-[#DFE104]" />
                  {getStageTitle(stage)}
                </span>
                <span className="font-mono font-bold text-[#DFE104]">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Progress Bar with glowing neon fill */}
              <div className="relative w-full h-2.5 bg-[#181A24] rounded-full overflow-hidden border border-[#272A3B]">
                <div
                  className="h-full bg-gradient-to-r from-[#DFE104] to-[#f5f749] transition-all duration-300 ease-out shadow-[0_0_12px_rgba(223,225,4,0.4)]"
                  style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
                />
              </div>

              {/* Speed, Downloaded Bytes, and ETA metrics */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="p-2 rounded-lg bg-[#141620] border border-[#1E202B]">
                  <div className="text-[10px] uppercase text-[#787C8A]">Velocidade</div>
                  <div className="text-xs font-semibold text-white mt-0.5">
                    {speedMbS > 0 ? `${speedMbS.toFixed(1)} MB/s` : '—'}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#141620] border border-[#1E202B]">
                  <div className="text-[10px] uppercase text-[#787C8A]">Baixado</div>
                  <div className="text-xs font-semibold text-white mt-0.5">
                    {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#141620] border border-[#1E202B]">
                  <div className="text-[10px] uppercase text-[#787C8A]">Restante</div>
                  <div className="text-xs font-semibold text-white mt-0.5">
                    {etaSeconds > 0 ? `${etaSeconds}s` : stage === 'extracting' ? 'Extraindo...' : '—'}
                  </div>
                </div>
              </div>

              {/* Stages Checklist */}
              <div className="pt-2 border-t border-[#1C1E29] space-y-1.5">
                {[
                  { num: 1, label: 'Conexão e verificação do link' },
                  { num: 2, label: 'Download do pacote compactado (ZIP)' },
                  { num: 3, label: 'Extração e verificação de arquivos' },
                  { num: 4, label: 'Isolamento de processo (fury-engine)' },
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-2 text-xs">
                    {currentStep > s.num ? (
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    ) : currentStep === s.num ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-[#343747] shrink-0" />
                    )}
                    <span
                      className={
                        currentStep >= s.num
                          ? 'text-[#C8CBD4]'
                          : 'text-[#505463]'
                      }
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-red-200">Falha no download</div>
                  <p className="text-[11px] leading-relaxed text-red-300/90">{error}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={startDownload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#DFE104] hover:bg-[#c9cb04] text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Tentar Novamente</span>
              </button>
            </div>
          ) : isInstalled ? (
            /* Installed State */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-emerald-200">
                    Motor Fury instalado e totalmente operacional
                  </div>
                  <p className="text-[11px] text-emerald-300/80">
                    O motor oficial Camoufox v2.0.0 está isolado na pasta .engine e pronto para lançar perfis com antidetect de alta fidelidade.
                  </p>
                </div>
              </div>

              {status.health.status === 'installed' && (
                <div className="p-3 rounded-xl bg-[#141620] border border-[#1E202B] space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[#787C8A]">
                    <span className="flex items-center gap-1.5">
                      <HardDrive size={13} /> Tamanho do Executável:
                    </span>
                    <span className="font-mono text-white">
                      {(status.health.size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#787C8A]">
                    <span>Versão Instalada:</span>
                    <span className="font-mono text-white">
                      {status.health.version}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#181A24] hover:bg-[#202330] text-[#C8CBD4] hover:text-white text-xs font-medium border border-[#2B2E3D] transition-colors cursor-pointer"
                >
                  Concluir
                </button>
                <button
                  type="button"
                  onClick={startDownload}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#151720] hover:bg-[#1E202C] text-[#DFE104] text-xs font-medium border border-[#DFE104]/30 hover:border-[#DFE104] transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Reinstalar / Reparar</span>
                </button>
              </div>
            </div>
          ) : (
            /* Missing or Broken State (Waiting for action) */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-200">
                    {isBroken ? 'Motor Corrompido ou Incompleto' : 'Motor Fury Não Instalado'}
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-300/80">
                    {isBroken
                      ? (status?.health as any)?.reason || 'Arquivos vitais ausentes ou executável quebrado.'
                      : 'Para executar perfis com spoofing de hardware e WebRTC, o motor Camoufox v2.0.0 precisa ser baixado.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={startDownload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#DFE104] hover:bg-[#c9cb04] text-black font-semibold text-xs shadow-lg shadow-[#DFE104]/10 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>
                  {isBroken ? 'Reparar e Baixar Novamente' : 'Baixar e Instalar Motor Agora'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
