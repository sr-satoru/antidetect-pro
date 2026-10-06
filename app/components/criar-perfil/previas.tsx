import React from 'react';
import { getRandomPreset } from '@/services/camoufox-presets';

interface PreviasProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

export const Previas: React.FC<PreviasProps> = ({ formData, onChange }) => {
  const handleRegenerateFingerprint = () => {
    const preset = getRandomPreset(formData.os);

    onChange('userAgent', preset.userAgent);
    onChange('platform', preset.platform);
    onChange('osVersion', preset.osVersion);
    onChange('cpuCores', preset.cpuCores);
    onChange('maxTouchPoints', preset.maxTouchPoints);
    onChange('customScreenWidth', preset.customScreenWidth);
    onChange('customScreenHeight', preset.customScreenHeight);
    onChange('devicePixelRatio', preset.devicePixelRatio);
    onChange('colorDepth', preset.colorDepth);
    onChange('webglVendor', preset.webglVendor);
    onChange('webglRenderer', preset.webglRenderer);
    onChange('canvasSeed', preset.canvasSeed);
    onChange('webglSeed', preset.webglSeed);
    onChange('audioSeed', preset.audioSeed);
    onChange('clientRectsSeed', preset.clientRectsSeed);
    onChange('mediaDevicesCount', {
      micros: preset.media.mics.length,
      webcams: preset.media.camera ? 1 : 0,
      speakers: preset.media.outs.length,
    });
    onChange('mediaDevicesDetails', preset.media);
  };

  const getWebRTCDisplay = () => {
    switch (formData.webrtcMode) {
      case 'disabled':
        return 'Desativado';
      case 'forward':
        return 'Encaminhar';
      case 'substitute':
        return 'Substituto';
      case 'real':
        return 'Real';
      default:
        return 'Com base no IP';
    }
  };

  const rows = [
    ...(formData.platformAccounts && formData.platformAccounts.length > 0
      ? [
          {
            label: 'Plataforma',
            value: formData.platformAccounts
              .map((a: any) =>
                a.platform === 'other' ? a.customDomain || 'Outro' : a.platform,
              )
              .join(', '),
          },
        ]
      : []),
    {
      label: 'Browser Kernel',
      value: `${formData.kernel || 'AstroFox'} [Firefox ${formData.kernelVersion || '150'}]`,
    },
    {
      label: 'Sistema / Arquitetura',
      value: `${formData.platform || (formData.os === 'windows' ? 'Win32' : formData.os === 'macos' ? 'MacIntel' : 'Linux x86_64')}`,
    },
    {
      label: 'User-Agent',
      value: formData.userAgent,
      isMono: true,
    },
    {
      label: 'WebRTC',
      value: getWebRTCDisplay(),
    },
    {
      label: 'Fuso horário',
      value:
        formData.timezoneMode === 'ip'
          ? 'Com base no IP'
          : formData.customTimezone,
    },
    {
      label: 'Localização',
      value:
        formData.locationMode === 'ip'
          ? `[${formData.locationPermission === 'ask' ? 'Perguntar' : 'Bloquear'}] Com base no IP`
          : formData.locationMode === 'block'
            ? 'Bloqueado'
            : `[${formData.locationPermission === 'ask' ? 'Perguntar' : 'Bloquear'}] ${formData.customLatitude || '0'}, ${formData.customLongitude || '0'}`,
    },
    {
      label: 'Língua',
      value:
        formData.languageMode === 'ip'
          ? 'Com base no IP'
          : formData.customLanguage?.split(',')[0] || 'Personalizado',
    },
    {
      label: 'Resolução do Ecrã',
      value: `${formData.customScreenWidth || 1920} × ${formData.customScreenHeight || 1080} (DPR ${formData.devicePixelRatio || 1})`,
    },
    {
      label: 'Metadados WebGL',
      value: `${formData.webglRenderer || 'Intel(R) HD Graphics'} (${formData.webglVendor || 'Google Inc.'})`,
    },
    {
      label: 'CPU / Processador',
      value: `${formData.cpuCores || 8} núcleos`,
    },
    {
      label: 'Touch Points',
      value: `${formData.maxTouchPoints || 0} pontos`,
    },
    {
      label: 'Dispositivos de Mídia',
      value: `${formData.mediaDevicesCount?.micros || 1} Mic, ${formData.mediaDevicesCount?.speakers || 2} Saídas, ${formData.mediaDevicesCount?.webcams || 1} Câmera`,
    },
    {
      label: 'RAM',
      value: `${formData.ramGb || 8} GB`,
    },
    {
      label: 'Canvas',
      value: formData.hardwareNoise?.canvas
        ? `Ruído Ativo (${formData.canvasSeed || 'Seed'})`
        : 'Nativo',
    },
    {
      label: 'Imagem WebGL',
      value: formData.hardwareNoise?.webglImage
        ? `Ruído Ativo (${formData.webglSeed || 'Seed'})`
        : 'Nativo',
    },
    {
      label: 'AudioContext',
      value: formData.hardwareNoise?.audioContext
        ? `Ruído Ativo (${formData.audioSeed || 'Seed'})`
        : 'Nativo',
    },
    {
      label: 'Bateria',
      value:
        formData.batteryMode === 'desktop'
          ? 'Tomada (100%)'
          : formData.batteryMode === 'laptop'
            ? 'Bateria (85%)'
            : 'Desativado',
    },
    {
      label: 'Do Not Track',
      value:
        formData.doNotTrackMode === 'default'
          ? 'Predefinição'
          : formData.doNotTrackMode === 'open'
            ? 'Ativado'
            : 'Desativado',
    },
    {
      label: 'Port Scan',
      value:
        formData.portScanProtection === 'open'
          ? formData.portScanAllowedPorts
            ? `Ativado (${formData.portScanAllowedPorts})`
            : 'Ativado'
          : 'Desativado',
    },
    {
      label: 'Acel. de Hardware',
      value:
        formData.hardwareAcceleration === 'default'
          ? 'Predefinição'
          : formData.hardwareAcceleration === 'open'
            ? 'Ativado'
            : 'Desativado',
    },
  ];

  return (
    <div className="flex w-full shrink-0 flex-col justify-between rounded-xl border border-slate-200 dark:border-[#333540] bg-slate-50 dark:bg-[#212228] p-5 shadow-sm shadow-slate-200/50 dark:shadow-lg lg:sticky lg:top-0 lg:w-[370px]">
      <div>
        {/* Header do card com título e botão New fingerprint */}
        <div className="mb-3.5 flex items-center justify-between border-b border-slate-200 dark:border-[#2C2E38] pb-3.5">
          <h3 className="text-[14px] font-semibold tracking-wide text-slate-900 dark:text-[#E5E7EB]">
            Visão Geral (Camoufox)
          </h3>
          <button
            type="button"
            onClick={handleRegenerateFingerprint}
            className="group flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-[#00FF66] transition-colors dark:hover:text-[#00FF66]/80"
            title="Sorteia uma máquina real completa do catálogo oficial do Camoufox"
          >
            {/* Ícone Shuffle */}
            <svg
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            <span>New fingerprint</span>
          </button>
        </div>

        {/* Lista de parâmetros chave-valor com scroll sutil */}
        <div className="max-h-[calc(100vh-220px)] space-y-2.5 overflow-y-auto pr-1 text-[11.5px]">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[125px_1fr] items-start gap-2 leading-[1.35]"
            >
              <span className="font-normal text-slate-500 dark:text-[#8E92A2] select-none">
                {row.label}
              </span>
              <span
                className={`text-right leading-tight font-normal break-words text-slate-800 dark:text-[#D3D6E0] ${
                  row.isMono ? 'font-mono text-[10.5px] opacity-90' : ''
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé da prévia */}
      <div className="mt-6 border-t border-slate-200 dark:border-[#2C2E38] pt-4 text-[11px] text-slate-500 dark:text-[#8E92A2]">
        Presets oficiais carregados de{' '}
        <span className="font-medium text-emerald-600 dark:text-[#00FF66]">
          backend/presets
        </span>
        .
      </div>
    </div>
  );
};
