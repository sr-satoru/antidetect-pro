import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRandomPreset } from '@/services/navegador-presets';
import { serviceBasePresets } from '@/services/presets/service.base-presets';
import { generateDeviceName, generateMacAddress } from './impressoes';

interface PreviasProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

export const Previas: React.FC<PreviasProps> = ({ formData, onChange }) => {
  const navigate = useNavigate();
  const handleRegenerateFingerprint = () => {
    const activePreset = serviceBasePresets.getActivePreset();
    const currentOs = formData.os || activePreset.defaultOS;
    const currentKernel = formData.kernel || activePreset.defaultKernel;
    const preset = getRandomPreset(currentOs, currentKernel);

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
    if (preset.deviceMemory) {
      onChange('deviceMemory', preset.deviceMemory);
    }
    if (preset.userAgentData) {
      onChange('userAgentData', preset.userAgentData);
    }
    if (preset.kernelVersion) {
      onChange('kernelVersion', preset.kernelVersion);
    }
    onChange('deviceName', generateDeviceName(currentOs));
    onChange('macAddress', generateMacAddress(currentOs));
    onChange('screenResolution', 'Com base no User-Agent');
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
    ...(formData.openTabsUrls && formData.openTabsUrls.trim()
      ? [
        {
          label: 'Abas Específicas',
          value: formData.openTabsUrls.split('\n')[0].trim(),
          isMono: true,
        },
      ]
      : []),
    {
      label: 'Browser Kernel',
      value: formData.kernel === 'AstroBrowser'
        ? `AstroBrowser [Chromium ${formData.kernelVersion}]`
        : `AstroFox [Firefox ${formData.kernelVersion}]`,
    },
    {
      label: 'Sistema / Arquitetura',
      value: formData.platform,
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
          : formData.customTimezone || 'Com base no IP',
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
      value: `${formData.customScreenWidth} × ${formData.customScreenHeight} (DPR ${formData.devicePixelRatio}) • ${formData.screenResolution}`,
    },
    {
      label: 'Metadados WebGL',
      value: formData.webglMetadataMode === 'default'
        ? 'Predefinição'
        : `${formData.webglRenderer} (${formData.webglVendor})`,
    },
    {
      label: 'CPU / Processador',
      value: `${formData.cpuCores} núcleos`,
    },
    {
      label: 'Touch Points',
      value: `${formData.maxTouchPoints} pontos`,
    },
    {
      label: 'Dispositivos de Mídia',
      value: `${formData.mediaDevicesCount?.micros} Mic, ${formData.mediaDevicesCount?.speakers} Saídas, ${formData.mediaDevicesCount?.webcams} Câmera`,
    },
    {
      label: 'RAM',
      value: `${formData.ramGb} GB`,
    },
    {
      label: 'Nome do dispositivo',
      value: formData.deviceNameMode === 'default' ? 'Predefinição' : (formData.deviceName || 'Gerado automaticamente'),
    },
    {
      label: 'MAC Address',
      value: formData.macAddressMode === 'default' ? 'Predefinição' : (formData.macAddress || 'Gerado automaticamente'),
      isMono: true,
    },
    {
      label: 'Canvas',
      value: formData.hardwareNoise?.canvas
        ? `Ruído Ativo (${formData.canvasSeed})`
        : 'Nativo',
    },
    {
      label: 'Imagem WebGL',
      value: formData.hardwareNoise?.webglImage
        ? `Ruído Ativo (${formData.webglSeed})`
        : 'Nativo',
    },
    {
      label: 'AudioContext',
      value: formData.hardwareNoise?.audioContext
        ? `Ruído Ativo (${formData.audioSeed})`
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
    <div className="flex h-[calc(100vh-215px)] max-h-[850px] min-h-[500px] w-full flex-col justify-between rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] p-5 shadow-xs overflow-hidden">
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Header do card com título e botão New fingerprint */}
        <div className="mb-3.5 shrink-0 flex items-center justify-between border-b border-slate-200/80 dark:border-[#2D3039] pb-3.5">
          <h3 className="text-[14px] font-semibold tracking-wide text-slate-900 dark:text-white">
            Visão Geral ({formData.kernel === 'AstroBrowser' ? 'AstroBrowser' : 'AstroFox'})
          </h3>
          <button
            type="button"
            onClick={handleRegenerateFingerprint}
            className="group flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] dark:text-[#A78BFA] transition-colors dark:hover:text-[#C4B5FD]"
            title="Sorteia uma máquina real completa do catálogo oficial"
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

        {/* Lista de parâmetros chave-valor com scroll sutil e quebra de linha fluida (sem scroll horizontal) */}
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto overflow-x-hidden pr-1.5 text-[12.5px] scrollbar-thin overscroll-contain">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-2.5 leading-snug"
            >
              <span className="shrink-0 font-normal text-slate-500 dark:text-[#9DA2B4] select-none text-[12px]">
                {row.label}
              </span>
              <span
                className={`min-w-0 text-right leading-snug font-normal break-words [overflow-wrap:anywhere] text-slate-800 dark:text-white ${
                  row.isMono ? 'font-mono text-[11.5px] opacity-90' : 'text-[12.5px]'
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé da prévia */}
      <div className="mt-4 shrink-0 border-t border-slate-200/80 dark:border-[#2D3039] pt-3 text-[11px] text-slate-500 dark:text-[#9DA2B4] select-none text-center">
        Presets oficiais carregados de{' '}
        <button
          type="button"
          onClick={() => navigate('/configuration?tab=browser')}
          className="font-medium text-[#7C3AED] hover:text-[#6D28D9] dark:text-[#A78BFA] dark:hover:text-[#C4B5FD] underline decoration-[#7C3AED]/40 hover:decoration-[#7C3AED] cursor-pointer transition-colors"
          title="Abrir configurações de Navegador & Antidetect"
        >
          backend/presets
        </button>
        .
      </div>
    </div>
  );
};

export default Previas;
