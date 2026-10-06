import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '@/config/perfil.json';
import { GeralTab } from '@/components/criar-perfil/geral';
import { ProxyTab } from '@/components/criar-perfil/proxy';
import { ImpressaoDigitalTab } from '@/components/criar-perfil/impressoes';
import { PlataformaTab } from '@/components/criar-perfil/plataforma';
import { AvancadoTab } from '@/components/criar-perfil/avancado';
import { Previas } from '@/components/criar-perfil/previas';
import { api } from '@/services/index.api';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';

import { getRandomPreset } from '@/services/camoufox-presets';

const getInitialProfileFormData = (suggestedOS: string = 'linux') => {
  const preset = getRandomPreset(suggestedOS);

  return {
    name: '',
    group: 'Desagrupado',
    tags: [] as string[],
    kernel: 'AstroFox',
    kernelVersion: '150',
    os: preset.os,
    osVersion: preset.osVersion,
    platform: preset.platform,
    userAgent: preset.userAgent,
    userAgentCategory: 'Todo',
    cookies: '',
    notes: '',

    proxyMode: 'custom',
    proxyType: 'none',
    proxyHost: '',
    proxyPort: '',
    proxyUser: '',
    proxyPass: '',
    proxyRotationUrl: '',
    ipChecker: 'IP2Location',
    socksRemoteDns: true,

    platformUrl: '',
    platformAccounts: [] as any[],
    duplicateCheckRules: {
      usernamePassword: true,
      cookie: true,
      cUser: true,
    },
    openTabsUrls: '',

    cpuMode: 'custom',
    cpuCores: preset.cpuCores,
    webrtcMode: 'disabled',
    timezoneMode: 'ip',
    customTimezone: 'America/Sao_Paulo',
    locationMode: 'ip',
    locationPermission: 'ask',
    customLatitude: '',
    customLongitude: '',
    customAccuracy: 1000,
    displayLanguageMode: 'language',
    screenResolutionMode: 'default',
    screenResolution: `${preset.customScreenWidth} × ${preset.customScreenHeight} (DPR ${preset.devicePixelRatio})`,
    customScreenWidth: preset.customScreenWidth,
    customScreenHeight: preset.customScreenHeight,
    devicePixelRatio: preset.devicePixelRatio,
    fontsMode: 'default',
    colorDepth: preset.colorDepth,
    languageMode: 'ip',
    customLanguage: 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    audioSampleRate: 48000,
    hardwareNoise: {
      canvas: false,
      webglImage: false,
      audioContext: false,
      mediaDevices: false,
      clientRects: false,
      speechVoices: false,
      fontPack: false,
      fontMetrics: false,
    },
    clientRectsSeed: preset.clientRectsSeed,
    canvasSeed: preset.canvasSeed,
    webglSeed: preset.webglSeed,
    audioSeed: preset.audioSeed,
    webglMetadataMode: 'custom',
    webglVendor: preset.webglVendor,
    webglRenderer: preset.webglRenderer,
    webgpuMode: 'webgl',
    ramMode: 'custom',
    ramGb: 8,
    deviceNameMode: 'custom',
    deviceName: '',
    macAddressMode: 'custom',
    macAddress: '',
    doNotTrackMode: 'default',
    portScanProtection: 'open',
    portScanAllowedPorts: '',
    hardwareAcceleration: 'default',
    disableTlsFeatures: 'close',

    maxTouchPoints: preset.maxTouchPoints,
    batteryMode: 'desktop',
    mediaDevicesCount: {
      micros: preset.media.mics.length,
      webcams: preset.media.camera ? 1 : 0,
      speakers: preset.media.outs.length,
    },
    mediaDevicesDetails: preset.media,
    doNotTrack: 'unspecified',
    globalPrivacyControl: false,
    memorySaver: false,
    dnsBlocklist: 'normal',
    ephemeral: false,
    enablePassword: false,
    password: '',
    launchHook: '',
    extensionMode: 'team',
    extensionCategory: 'kit_basico',
    extensions: [],
  };
};

export const CriarPerfilPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('geral');
  const [formData, setFormData] = useState<any>(() =>
    getInitialProfileFormData('linux'),
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const created = await api.profiles.create(formData);
      toast.success('Perfil criado com sucesso');

      navigate('/perfis');
    } catch (err: any) {
      toast.error(`Erro ao criar perfil: ${err.message || 'Falha na comunicação com o backend local.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] shadow-xl shadow-slate-900/5 dark:shadow-2xl">
      {/* Barra superior de Abas configurável via JSON */}
      <div className="flex shrink-0 items-center gap-8 overflow-x-auto border-b border-slate-200 dark:border-[#30323E] bg-slate-50/80 dark:bg-[#24252D] px-6 pt-4 select-none">
        {config.tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative cursor-pointer pb-3 text-[13.5px] tracking-wide transition-all ${
                isActive
                  ? 'font-semibold text-slate-900 dark:text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2.5px] after:rounded-t-sm after:bg-emerald-600 dark:after:bg-white after:content-[""]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#8E92A2] dark:hover:text-[#C4C7D5]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Corpo com Grid rolável: Conteúdo ativo (Esquerda) e Prévias (Direita) */}
      <div className="flex flex-1 flex-col items-start gap-6 overflow-y-auto p-5 lg:flex-row lg:gap-8 lg:p-7">
        {activeTab === 'geral' && (
          <GeralTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'proxy' && (
          <ProxyTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'impressao' && (
          <ImpressaoDigitalTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'plataforma' && (
          <PlataformaTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'avancado' && (
          <AvancadoTab formData={formData} onChange={handleChange} />
        )}

        {/* Coluna da Direita: Painel Visão Geral (Prévias) */}
        <Previas formData={formData} onChange={handleChange} />
      </div>

      {/* Rodapé fixado na base com botões OK e Cancelar e suporte */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-200 dark:border-[#30323E] bg-slate-50 dark:bg-[#1F2027] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 cursor-pointer rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-[#1C1D24] dark:border dark:border-white/30 dark:hover:border-white dark:text-white px-7 py-2 text-[13px] font-medium shadow-xs dark:shadow-md transition-all select-none dark:hover:bg-[#252834] active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving && <Loader2 size={14} className="animate-spin text-white" />}
            <span>{isSaving ? 'Salvando...' : 'OK'}</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => navigate('/perfis')}
            className="cursor-pointer rounded-md bg-slate-200/80 hover:bg-slate-300 text-slate-700 dark:bg-[#2B2D38] px-6 py-2 text-[13px] font-medium dark:text-[#C4C7D5] transition-all select-none dark:hover:bg-[#363847] dark:hover:text-white active:scale-[0.98] disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>

        {/* Ícone flutuante de atendimento / suporte no canto inferior direito */}
        <div
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white border border-slate-200 hover:border-slate-400 text-slate-700 shadow-sm dark:bg-[#1C1D24] dark:border-white/20 dark:hover:border-white dark:text-white dark:shadow-lg transition-all hover:scale-105 dark:hover:bg-[#252834]"
          title="Suporte"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CriarPerfilPage;
