import React, { useEffect, useState, useRef } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { NativeSelect as Select } from '@/components/ui/select';
import config from '@/config/perfil.json';
import { Shuffle, Search, ChevronDown, Check } from 'lucide-react';

interface ImpressaoDigitalTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

import {
  getGpuOptions,
  getScreenResolutions,
  getCpuCoreOptions,
  getFontsForOs,
  getMediaDevicesForOs,
  getRandomPreset,
  GpuOption,
} from '@/services/navegador-presets';
import { serviceBasePresets } from '@/services/presets/service.base-presets';


function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function generateDeviceName(os: string): string {
  const normalized = (os || 'windows').toLowerCase();
  switch (normalized) {
    case 'windows': {
      const prefix = Math.random() > 0.4 ? 'DESKTOP' : 'LAPTOP';
      return `${prefix}-${randomAlphanumeric(7)}`;
    }
    case 'macos': {
      const macModels = [
        'MacBook-Pro.local',
        'MacBook-Air.local',
        'MacBookPro18,1',
        'MacBookAir10,1',
        'Mac-Studio.local',
        'iMac.local',
        `MacBook-de-${['Alex', 'Lucas', 'Carlos', 'Gabriel', 'Rafael', 'Matheus'][Math.floor(Math.random() * 6)]}.local`,
      ];
      return macModels[Math.floor(Math.random() * macModels.length)];
    }
    case 'linux': {
      const linuxHosts = [
        `workstation-${randomAlphanumeric(4).toLowerCase()}`,
        `ubuntu-desktop-${randomAlphanumeric(4).toLowerCase()}`,
        `fedora-pc-${randomAlphanumeric(4).toLowerCase()}`,
        `arch-box-${randomAlphanumeric(4).toLowerCase()}`,
        `linux-node-${randomAlphanumeric(4).toLowerCase()}`,
      ];
      return linuxHosts[Math.floor(Math.random() * linuxHosts.length)];
    }
    case 'android': {
      const androidModels = [
        'SM-S918B', // Galaxy S23 Ultra
        'SM-S928B', // Galaxy S24 Ultra
        'SM-G998B', // Galaxy S21 Ultra
        'Pixel-8-Pro',
        'Pixel-7a',
        'Xiaomi-13-Ultra',
        'OnePlus-11-5G',
      ];
      return androidModels[Math.floor(Math.random() * androidModels.length)];
    }
    case 'ios': {
      const iosNames = [
        'iPhone 15 Pro',
        'iPhone 15 Pro Max',
        'iPhone 14 Pro',
        'iPhone 13',
        'iPad Pro (12.9-inch)',
        'iPad Air (5th gen)',
      ];
      return iosNames[Math.floor(Math.random() * iosNames.length)];
    }
    default:
      return `DESKTOP-${randomAlphanumeric(7)}`;
  }
}

const OUI_BY_OS: Record<string, string[]> = {
  windows: [
    '00:1B:21',
    '00:E0:4C',
    '9C:B6:D0',
    '70:85:C2',
    'B4:2E:99',
    '28:D2:44',
  ],
  macos: [
    'A4:83:E7',
    'F0:18:98',
    '3C:22:FB',
    '14:7D:DA',
    'AC:BC:32',
    '8C:85:90',
  ],
  linux: [
    '00:0C:29',
    '52:54:00',
    '00:16:3E',
    '00:1B:21',
    '70:85:C2',
    '00:E0:4C',
  ],
  android: [
    '54:4E:90',
    '98:D6:F7',
    '44:65:0D',
    'B8:8A:EC',
    '3C:CD:57',
    'F4:F5:24',
  ],
  ios: ['A4:83:E7', 'F0:18:98', '3C:22:FB', '14:7D:DA', 'AC:BC:32', '8C:85:90'],
};

export function generateMacAddress(os: string): string {
  const normalized = (os || 'windows').toLowerCase();
  const ouis = OUI_BY_OS[normalized] || OUI_BY_OS.windows;
  const prefix = ouis[Math.floor(Math.random() * ouis.length)];
  const hex = '0123456789ABCDEF';
  const octet = () =>
    `${hex.charAt(Math.floor(Math.random() * 16))}${hex.charAt(Math.floor(Math.random() * 16))}`;
  return `${prefix}:${octet()}:${octet()}:${octet()}`;
}

// ============================================================================
// Subcomponentes de Formulário
// ============================================================================

const FormRow: React.FC<{
  label: string;
  children: React.ReactNode;
  alignTop?: boolean;
}> = ({ label, children, alignTop = false }) => (
  <div
    className={`flex flex-col gap-2 pt-1 sm:flex-row sm:gap-4 ${alignTop ? 'sm:items-start' : 'sm:items-center'
      }`}
  >
    <label
      className={`shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[150px] sm:text-right ${alignTop ? 'pt-2' : ''
        }`}
    >
      {label}
    </label>
    <div className={alignTop ? 'flex-1 space-y-2' : 'flex-1'}>{children}</div>
  </div>
);

interface OptionItem {
  id: string;
  label: string;
  desc?: string;
}

const SegmentedGroup: React.FC<{
  options: OptionItem[];
  value: string;
  onChange: (id: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex w-fit flex-wrap items-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#14151B] p-0.5 shadow-2xs gap-0.5">
    {options.map((item) => {
      const isSelected = value === item.id;
      const btn = (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-medium transition-all select-none ${isSelected
              ? 'border border-slate-300 dark:border-white/10 bg-white text-slate-900 dark:bg-white/[0.09] font-semibold dark:text-white shadow-xs'
              : 'border border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8E92A2] dark:hover:bg-white/[0.04] dark:hover:text-white'
            }`}
        >
          {item.label}
        </button>
      );

      if (item.desc) {
        return (
          <Tooltip key={item.id} content={item.desc} position="top">
            {btn}
          </Tooltip>
        );
      }
      return btn;
    })}
  </div>
);

const ShuffleInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onShuffle: () => void;
  title: string;
  mono?: boolean;
  maxWidthClass?: string;
  placeholder?: string;
}> = ({
  value,
  onChange,
  onShuffle,
  title,
  mono = false,
  maxWidthClass = 'max-w-md',
  placeholder = '',
}) => (
    <div className={`flex ${maxWidthClass} items-center gap-2`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3.5 py-2 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs ${mono ? 'font-mono' : ''
          }`}
      />
      <button
        type="button"
        onClick={onShuffle}
        className="flex h-[37px] w-[37px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 text-emerald-600 dark:bg-white/[0.05] dark:text-[#00FF66] shadow-2xs transition-all dark:hover:border-white/20 dark:hover:bg-white/10 active:scale-95"
        title={title}
      >
        <Shuffle size={14} />
      </button>
    </div>
  );

const NoisePill: React.FC<{
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ label, desc, checked, onToggle }) => (
  <Tooltip content={desc} position="top">
    <div
      onClick={onToggle}
      className="group flex cursor-pointer items-center gap-2 py-1 select-none"
    >
      <div
        className={`h-4 w-8 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${checked
            ? 'bg-[#238636]'
            : 'bg-slate-300 dark:bg-[#333541]'
          }`}
      >
        <div
          className={`h-3 w-3 rounded-full bg-white transition-transform duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'
            }`}
        />
      </div>
      <span
        className={`text-[12.5px] transition-colors ${checked ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 group-hover:text-slate-900 dark:text-[#8E92A2] dark:group-hover:text-[#C5C9D7]'
          }`}
      >
        {label}
      </span>
    </div>
  </Tooltip>
);

interface SearchableSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Selecione uma opção...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = searchTerm
    ? options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Botão Gatilho / Trigger com estilo idêntico ao Select padrão */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className="w-full flex items-center justify-between cursor-pointer rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-[12.5px] text-slate-800 dark:text-[#C4C7D5] transition-all hover:border-slate-400 dark:hover:border-white/20 focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs text-left select-none"
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 dark:text-[#7E8294] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {/* Dropdown Menu com Search na primeira linha */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full z-50 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#171821] shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* PRIMEIRA LINHA: Input de Busca com Ícone */}
          <div className="p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#12131A]">
            <div className="relative flex items-center">
              <Search
                size={13}
                className="absolute left-2.5 pointer-events-none text-slate-400 dark:text-[#7E8294]"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded bg-white dark:bg-[#1C1D26] pl-8 pr-7 py-1 text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5E6273] border border-slate-200 dark:border-white/10 focus:border-emerald-500 dark:focus:border-white/30 focus:outline-none shadow-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* LISTA ROLÁVEL DE OPÇÕES */}
          <div className="max-h-56 overflow-y-auto p-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-2 text-center text-[12px] text-slate-400 dark:text-[#6F7386]">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt === value;
                return (
                  <div
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-[12px] rounded cursor-pointer transition-colors ${isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                        : 'text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Componente Principal ImpressaoDigitalTab
// ============================================================================

export const ImpressaoDigitalTab: React.FC<ImpressaoDigitalTabProps> = ({
  formData,
  onChange,
}) => {
  const activePreset = serviceBasePresets.getActivePreset();
  const currentOs = (formData.os || activePreset.defaultOS).toLowerCase();
  const currentKernel = formData.kernel || (currentOs === 'android' ? 'AstroBrowser' : activePreset.defaultKernel);
  const gpuList = getGpuOptions(currentOs, currentKernel);
  const screenOptions = getScreenResolutions(currentOs, currentKernel);
  const cpuCoresList = getCpuCoreOptions(currentOs, currentKernel);
  const osFonts = getFontsForOs(currentOs, currentKernel);

  // Sincroniza e garante dados realistas caso os campos estejam vazios ou inconsistentes com o SO
  useEffect(() => {
    const isRendererInPool = gpuList.some(
      (g) => g.renderer === formData.webglRenderer
    );

    // Se o renderer estiver vazio ou pertencer a um ecossistema completamente conflitante
    if (!formData.webglRenderer || !isRendererInPool) {
      const defaultGpu = gpuList[0];
      if (defaultGpu) {
        onChange('webglVendor', defaultGpu.vendor);
        onChange('webglRenderer', defaultGpu.renderer);
      }
    }

    // Se nome do dispositivo estiver vazio, gera um hostname realista para o SO
    if (!formData.deviceName) {
      onChange('deviceName', generateDeviceName(currentOs));
    }

    // Se MAC Address estiver vazio, gera um MAC formatado real
    if (!formData.macAddress) {
      onChange('macAddress', generateMacAddress(currentOs));
    }
  }, [currentOs, currentKernel]);

  const handleShuffleRenderer = () => {
    if (gpuList.length === 0) return;
    const random = gpuList[Math.floor(Math.random() * gpuList.length)];
    onChange('webglVendor', random.vendor);
    onChange('webglRenderer', random.renderer);
  };

  const handleShuffleDeviceName = () => {
    const name = generateDeviceName(currentOs);
    onChange('deviceName', name);
  };

  const handleShuffleMacAddress = () => {
    const mac = generateMacAddress(currentOs);
    onChange('macAddress', mac);
  };

  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      {/* Título de seção com linha divisória Obsidian */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-[#7E8294] select-none">
          Impressão Digital (Fingerprint)
        </span>
        <div className="h-[1px] flex-1 bg-white/10" />
      </div>

      {/* 1. WebRTC */}
      <FormRow label="WebRTC">
        <SegmentedGroup
          options={config.webrtcModes}
          value={formData.webrtcMode}
          onChange={(val) => onChange('webrtcMode', val)}
        />
      </FormRow>

      {/* 2. Fuso horário */}
      <FormRow label="Fuso horário" alignTop>
        <SegmentedGroup
          options={config.timezoneModes}
          value={formData.timezoneMode}
          onChange={(val) => onChange('timezoneMode', val)}
        />
        {formData.timezoneMode === 'custom' && (
          <div className="max-w-md">
            <Select
              value={formData.customTimezone}
              onChange={(e) => onChange('customTimezone', e.target.value)}
            >
              {config.timezones.map((tz) => (
                <option key={tz.value} value={tz.value} className="bg-[#14151B] text-[#C4C7D5]">
                  {tz.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </FormRow>

      {/* 3. Localização */}
      {(() => {
        const isLatInvalid = Boolean(
          formData.customLatitude &&
          (isNaN(Number(formData.customLatitude)) ||
            Number(formData.customLatitude) < -90 ||
            Number(formData.customLatitude) > 90)
        );
        const isLngInvalid = Boolean(
          formData.customLongitude &&
          (isNaN(Number(formData.customLongitude)) ||
            Number(formData.customLongitude) < -180 ||
            Number(formData.customLongitude) > 180)
        );

        return (
          <FormRow label="Localização" alignTop>
            <SegmentedGroup
              options={config.locationModes}
              value={formData.locationMode}
              onChange={(val) => onChange('locationMode', val)}
            />

            {/* Permissão de localização via radio buttons */}
            {formData.locationMode !== 'block' && (
              <div className="space-y-1.5 pt-1">
                {config.locationPermissions.map((perm) => (
                  <label
                    key={perm.id}
                    onClick={() => onChange('locationPermission', perm.id)}
                    className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[#A6ABB9] select-none hover:text-white"
                  >
                    <input
                      type="radio"
                      name="locationPermission"
                      checked={formData.locationPermission === perm.id}
                      onChange={() => { }}
                      className="cursor-pointer accent-[#00FF66]"
                    />
                    <span>{perm.text}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Coordenadas customizadas */}
            {formData.locationMode === 'custom' && (
              <div className="max-w-lg space-y-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] p-3.5 shadow-xs">
                <div>
                  <label className="mb-1.5 block text-[12px] text-slate-600 dark:text-[#A6ABB9]">
                    <span className="mr-1 font-bold text-red-500">*</span>
                    Latitude / Longitude
                  </label>
                  <div className="grid grid-cols-2 items-start gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="55"
                        value={formData.customLatitude || ''}
                        onChange={(e) =>
                          onChange('customLatitude', e.target.value)
                        }
                        className={`w-full rounded-md bg-white dark:bg-[#16171D] px-3 py-2 text-[12.5px] text-slate-900 dark:text-white transition-colors focus:outline-none ${isLatInvalid
                            ? 'border border-[#F87171] ring-1 ring-[#F87171]/20 focus:border-[#F87171]'
                            : 'border border-slate-300 dark:border-white/10 focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10'
                          }`}
                      />
                      {isLatInvalid && (
                        <span className="mt-1 block text-[11px] leading-tight text-[#F87171]">
                          A latitude deve ser de -90° a 90°.
                        </span>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="55666"
                        value={formData.customLongitude || ''}
                        onChange={(e) =>
                          onChange('customLongitude', e.target.value)
                        }
                        className={`w-full rounded-md bg-white dark:bg-[#16171D] px-3 py-2 text-[12.5px] text-slate-900 dark:text-white transition-colors focus:outline-none ${isLngInvalid
                            ? 'border border-[#F87171] ring-1 ring-[#F87171]/20 focus:border-[#F87171]'
                            : 'border border-slate-300 dark:border-white/10 focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10'
                          }`}
                      />
                      {isLngInvalid && (
                        <span className="mt-1 block text-[11px] leading-tight text-[#F87171]">
                          A longitude deve ser de -180° a 180°.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] text-slate-600 dark:text-[#A6ABB9]">
                    Precisão (m)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formData.customAccuracy ?? 1000}
                    onChange={(e) =>
                      onChange('customAccuracy', Number(e.target.value) || 0)
                    }
                    className="w-36 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#16171D] px-3 py-2 text-[12.5px] text-slate-900 dark:text-white transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </FormRow>
        );
      })()}

      {/* 4. Língua */}
      <FormRow label="Língua" alignTop>
        <SegmentedGroup
          options={config.languageModes}
          value={formData.languageMode}
          onChange={(val) => onChange('languageMode', val)}
        />
        {formData.languageMode === 'custom' && (
          <div className="max-w-md">
            <Select
              value={formData.customLanguage}
              onChange={(e) => onChange('customLanguage', e.target.value)}
            >
              {config.languages.map((lang) => (
                <option key={lang.value} value={lang.value} className="bg-[#14151B] text-[#C4C7D5]">
                  {lang.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </FormRow>

      {/* 5. Resolução do Ecrã */}
      <FormRow label="Resolução do Ecrã" alignTop>
        <SegmentedGroup
          options={config.screenResolutionModes}
          value={formData.screenResolutionMode}
          onChange={(val) => onChange('screenResolutionMode', val)}
        />
        {formData.screenResolutionMode === 'default' && (
          <div className="max-w-md">
            <Select
              value={formData.screenResolution || 'Com base no User-Agent'}
              onChange={(e) => {
                const label = e.target.value;
                onChange('screenResolution', label);
                const sel = screenOptions.find((s) => s.label === label);
                if (sel) {
                  onChange('customScreenWidth', sel.width);
                  onChange('customScreenHeight', sel.height);
                  onChange('devicePixelRatio', sel.dpr);
                } else if (label === 'Com base no User-Agent') {
                  const defaultPreset = getRandomPreset(currentOs, currentKernel);
                  onChange('customScreenWidth', defaultPreset.customScreenWidth);
                  onChange('customScreenHeight', defaultPreset.customScreenHeight);
                  onChange('devicePixelRatio', defaultPreset.devicePixelRatio);
                }
              }}
            >
              <option value="Com base no User-Agent" className="bg-[#14151B] text-[#C4C7D5]">
                Com base no User-Agent
              </option>
              {screenOptions.map((res) => (
                <option key={res.label} value={res.label} className="bg-[#14151B] text-[#C4C7D5]">
                  {res.label}
                </option>
              ))}
            </Select>
          </div>
        )}
        {formData.screenResolutionMode === 'custom' && (
          <div className="flex max-w-sm items-center gap-2">
            <input
              type="text"
              placeholder="1920"
              value={formData.customScreenWidth ?? ''}
              onChange={(e) =>
                onChange('customScreenWidth', e.target.value.replace(/\D/g, ''))
              }
              className="w-24 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-center text-[12px] text-slate-900 dark:text-white transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
            />
            <span className="text-slate-400 dark:text-[#8E92A2]">×</span>
            <input
              type="text"
              placeholder="1080"
              value={formData.customScreenHeight ?? ''}
              onChange={(e) =>
                onChange(
                  'customScreenHeight',
                  e.target.value.replace(/\D/g, '')
                )
              }
              className="w-24 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-center text-[12px] text-slate-900 dark:text-white transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
            />
          </div>
        )}
      </FormRow>

      {/* 6. Tipos de Letra */}
      <FormRow label="Tipos de Letra" alignTop>
        <SegmentedGroup
          options={config.fontsModes}
          value={formData.fontsMode || 'default'}
          onChange={(val) => onChange('fontsMode', val)}
        />
        {formData.fontsMode === 'custom' && (
          <div className="max-w-md">
            <SearchableSelect
              value={formData.customFont || (osFonts.includes('Arial') ? 'Arial' : osFonts[0] || '')}
              options={osFonts}
              placeholder="Pesquisar ou selecionar fonte..."
              onChange={(val) => {
                onChange('customFont', val);
                onChange('customFonts', [val]);
              }}
            />
          </div>
        )}
      </FormRow>

      {/* 7. Ruído de hardware (Switches inline) */}
      <FormRow label="Ruído de hardware" alignTop>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          {config.hardwareNoiseItems.map((toggle) => {
            const isChecked = !!(formData.hardwareNoise as any)[toggle.key];
            return (
              <NoisePill
                key={toggle.key}
                label={toggle.label}
                desc={toggle.desc}
                checked={isChecked}
                onToggle={() =>
                  onChange('hardwareNoise', {
                    ...formData.hardwareNoise,
                    [toggle.key]: !isChecked,
                  })
                }
              />
            );
          })}
        </div>
      </FormRow>

      {/* 8. Metadados WebGL */}
      <FormRow label="Metadados WebGL" alignTop>
        <SegmentedGroup
          options={config.webglMetadataModes}
          value={formData.webglMetadataMode || 'custom'}
          onChange={(val) => onChange('webglMetadataMode', val)}
        />
        {(formData.webglMetadataMode || 'custom') === 'custom' && (
          <div className="max-w-lg space-y-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] p-3.5 shadow-xs">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-slate-600 dark:text-[#8E92A2]">
                Fornecedor (Vendor)
              </label>
              <input
                type="text"
                value={formData.webglVendor || ''}
                onChange={(e) => onChange('webglVendor', e.target.value)}
                placeholder="Ex: Google Inc. (NVIDIA)"
                className="w-full rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#16171D] px-3.5 py-2 text-[12.5px] text-slate-900 dark:text-white transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[11.5px] font-medium text-slate-600 dark:text-[#8E92A2]">
                  Renderizador GPU ({currentOs.toUpperCase()})
                </label>
                <span className="text-[10.5px] text-slate-400 dark:text-[#6E7284]">
                  Catálogo Camoufox ({currentOs})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={formData.webglRenderer || ''}
                  onChange={(e) => {
                    const sel = gpuList.find((g) => g.renderer === e.target.value);
                    if (sel) {
                      onChange('webglVendor', sel.vendor);
                      onChange('webglRenderer', sel.renderer);
                    } else {
                      onChange('webglRenderer', e.target.value);
                    }
                  }}
                >
                  {gpuList.map((g) => (
                    <option key={g.renderer} value={g.renderer} className="bg-[#14151B] text-[#C4C7D5]">
                      {g.label}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={handleShuffleRenderer}
                  title={`Sortear Renderizador autêntico para ${currentOs}`}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-300 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E1F26] dark:hover:bg-[#252730] transition-colors"
                >
                  <Shuffle className="h-4 w-4 text-emerald-600 dark:text-[#00FF66]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </FormRow>

      {/* 9. WebGPU */}
      <FormRow label="WebGPU">
        <SegmentedGroup
          options={config.webgpuModes}
          value={formData.webgpuMode || 'webgl'}
          onChange={(val) => onChange('webgpuMode', val)}
        />
      </FormRow>

      {/* 10. CPU */}
      <FormRow label="CPU" alignTop>
        <SegmentedGroup
          options={config.cpuModes}
          value={formData.cpuMode || 'custom'}
          onChange={(val) => onChange('cpuMode', val)}
        />
        {(formData.cpuMode || 'custom') === 'custom' && (
          <div className="w-48">
            <Select
              value={formData.cpuCores}
              onChange={(e) => onChange('cpuCores', Number(e.target.value))}
            >
              {cpuCoresList.map((cores) => (
                <option key={cores} value={cores} className="bg-[#14151B] text-[#C4C7D5]">
                  {cores} núcleos
                </option>
              ))}
            </Select>
          </div>
        )}
      </FormRow>

      {/* 11. RAM */}
      <FormRow label="RAM" alignTop>
        <SegmentedGroup
          options={config.ramModes}
          value={formData.ramMode || 'custom'}
          onChange={(val) => onChange('ramMode', val)}
        />
        {(formData.ramMode || 'custom') === 'custom' && (
          <div className="w-48">
            <Select
              value={formData.ramGb}
              onChange={(e) => onChange('ramGb', Number(e.target.value))}
            >
              {config.ramOptions.map((ram) => (
                <option key={ram} value={ram} className="bg-[#14151B] text-[#C4C7D5]">
                  {ram} GB
                </option>
              ))}
            </Select>
          </div>
        )}
      </FormRow>

      {/* 12. Bateria */}
      <FormRow label="Bateria">
        <SegmentedGroup
          options={config.batteryModes}
          value={formData.batteryMode}
          onChange={(val) => onChange('batteryMode', val)}
        />
      </FormRow>

      {/* 13. Nome do dispositivo */}
      <FormRow label="Nome do dispositivo" alignTop>
        <SegmentedGroup
          options={config.deviceNameModes}
          value={formData.deviceNameMode || 'custom'}
          onChange={(val) => onChange('deviceNameMode', val)}
        />
        {(formData.deviceNameMode || 'custom') === 'custom' && (
          <div className="space-y-1">
            <ShuffleInput
              value={formData.deviceName || ''}
              onChange={(val) => onChange('deviceName', val)}
              onShuffle={handleShuffleDeviceName}
              title={`Sortear nome de máquina (${currentOs})`}
              placeholder={`ex: ${generateDeviceName(currentOs)}`}
            />
            <span className="block text-[11px] text-[#6E7284]">
              Hostname autêntico para ecossistema {currentOs.toUpperCase()}
            </span>
          </div>
        )}
      </FormRow>

      {/* 14. MAC Address */}
      <FormRow label="MAC Address" alignTop>
        <SegmentedGroup
          options={config.macAddressModes}
          value={formData.macAddressMode || 'custom'}
          onChange={(val) => onChange('macAddressMode', val)}
        />
        {(formData.macAddressMode || 'custom') === 'custom' && (
          <div className="space-y-1">
            <ShuffleInput
              value={formData.macAddress || ''}
              onChange={(val) => onChange('macAddress', val)}
              onShuffle={handleShuffleMacAddress}
              title={`Sortear MAC Address real (${currentOs})`}
              placeholder="00:1B:21:AA:BB:CC"
              mono
            />
            <span className="block text-[11px] text-[#6E7284]">
              Endereço físico verossímil com OUI legítimo
            </span>
          </div>
        )}
      </FormRow>

      {/* 15. Do Not Track */}
      <FormRow label="Do Not Track">
        <SegmentedGroup
          options={config.doNotTrackModes}
          value={formData.doNotTrackMode || 'default'}
          onChange={(val) => onChange('doNotTrackMode', val)}
        />
      </FormRow>

      {/* 16. Proteção de Port Scan */}
      <FormRow label="Proteção de Port Scan" alignTop>
        <SegmentedGroup
          options={config.portScanProtectionModes}
          value={formData.portScanProtection || 'open'}
          onChange={(val) => onChange('portScanProtection', val)}
        />
        <input
          type="text"
          placeholder="Opcional: Portas autorizadas (ex: 80, 443, 8080)"
          value={formData.portScanAllowedPorts || ''}
          onChange={(e) => onChange('portScanAllowedPorts', e.target.value)}
          className="w-full max-w-md rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#14151B] px-3.5 py-2 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
        />
      </FormRow>

      {/* 17. Aceleração de Hardware */}
      <FormRow label="Aceleração de Hardware">
        <SegmentedGroup
          options={config.hardwareAccelerationModes}
          value={formData.hardwareAcceleration || 'default'}
          onChange={(val) => onChange('hardwareAcceleration', val)}
        />
      </FormRow>

      {/* 18. Recursos TLS Legados */}
      <FormRow label="Recursos TLS Legados">
        <SegmentedGroup
          options={config.disableTlsFeaturesModes}
          value={formData.disableTlsFeatures || 'close'}
          onChange={(val) => onChange('disableTlsFeatures', val)}
        />
      </FormRow>

      {/* 19. Argumentos extras */}
      <FormRow label="Argumentos extras" alignTop>
        <textarea
          rows={3}
          value={formData.launchHook || ''}
          onChange={(e) => onChange('launchHook', e.target.value)}
          placeholder={`--disable-notifications\n--blink-settings=imagesEnabled=false`}
          className="w-full max-w-lg rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#14151B] px-3.5 py-2.5 font-mono text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
        />
      </FormRow>
    </div>
  );
};

export default ImpressaoDigitalTab;
