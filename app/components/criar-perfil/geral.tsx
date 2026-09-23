import React, { useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';

interface GeralTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

import { generateRandomDeviceName, generateRandomSeed } from '@/utils';

const renderOSIcon = (os: string): React.ReactNode => {
  switch (os) {
    case 'windows':
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.95" />
        </svg>
      );
    case 'macos':
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.61 1.35-.55.63-.99 1.65-.86 2.66.98.08 2.02-.51 2.54-1.16z" />
        </svg>
      );
    case 'linux':
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.002 0c-2.427 0-4.394 2.203-4.394 4.922 0 .546.082 1.071.233 1.567C6.012 7.747 4.8 9.875 4.8 12.3c0 2.057.87 3.896 2.22 5.166-.02.175-.045.352-.045.534 0 3.314 2.25 6 5.027 6s5.027-2.686 5.027-6c0-.182-.025-.359-.045-.534 1.35-1.27 2.22-3.109 2.22-5.166 0-2.425-1.212-4.553-3.041-5.811.151-.496.233-1.021.233-1.567C16.396 2.203 14.429 0 12.002 0z" />
        </svg>
      );
    case 'android':
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.082 12 8.082s-3.5902.329-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
        </svg>
      );
    case 'ios':
      return (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    default:
      return null;
  }
};

export const GeralTab: React.FC<GeralTabProps> = ({ formData, onChange }) => {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showUaDropdown, setShowUaDropdown] = useState(false);

  const osList = config.osOptions.map((item) => ({
    ...item,
    icon: renderOSIcon(item.id),
  }));

  const handleSelectOS = (selectedOS: string) => {
    onChange('os', selectedOS);
    const uas =
      (config.userAgents as Record<string, string[]>)[selectedOS] ||
      config.userAgents.linux;
    onChange('userAgent', uas[0]);
    onChange('deviceName', generateRandomDeviceName(selectedOS));
  };

  const handleShuffleUserAgent = () => {
    const uas =
      (config.userAgents as Record<string, string[]>)[formData.os] ||
      config.userAgents.linux;
    const currentIdx = uas.indexOf(formData.userAgent);
    const nextIdx = (currentIdx + 1) % uas.length;
    onChange('userAgent', uas[nextIdx]);
    onChange('clientRectsSeed', generateRandomSeed());
  };

  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      {/* 1. Nome */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Nome
        </label>
        <div className="relative flex-1">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value.slice(0, 100))}
            placeholder="Opcional: nome do perfil"
            className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 pr-16 text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-[#6B7082] select-none">
            {formData.name.length} / 100
          </span>
        </div>
      </div>

      {/* 2. Browser Kernel */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2.5 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Browser Kernel
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {/* SunBrowser */}
          <Tooltip
            content="Motor Chromium (Chrome): máxima compatibilidade com extensões e sites da web."
            position="top"
          >
            <div
              onClick={() => onChange('kernel', 'SunBrowser')}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3.5 py-2 transition-all select-none ${
                formData.kernel === 'SunBrowser'
                  ? 'border-[#2F80ED] bg-[#1D2536] text-white'
                  : 'border-[#333541] bg-[#1C1D24] text-[#9A9EB0] hover:border-[#444756]'
              }`}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF7A00] to-[#2F80ED] text-[10px] font-bold text-white">
                S
              </div>
              <span className="text-[13px] font-medium">SunBrowser</span>
              <svg
                className="ml-1 h-3.5 w-3.5 opacity-60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </Tooltip>

          {/* FlowerBrowser */}
          <Tooltip
            content="Motor Firefox / Camoufox: isolamento anti-impressão digital reforçado para perfis de alta proteção."
            position="top"
          >
            <div className="flex flex-col">
              <div
                onClick={() => onChange('kernel', 'FlowerBrowser')}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3.5 py-2 transition-all select-none ${
                  formData.kernel === 'FlowerBrowser'
                    ? 'border-[#2F80ED] bg-[#192233] text-white ring-1 ring-[#2F80ED]/30'
                    : 'border-[#333541] bg-[#1C1D24] text-[#9A9EB0] hover:border-[#444756]'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#2F80ED] to-[#00D2FF] text-[10px] font-bold text-white">
                  ✿
                </div>
                <span className="text-[13px] font-medium">FlowerBrowser</span>
                <svg
                  className="ml-1 h-3.5 w-3.5 opacity-60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <span className="pt-1 pl-1 text-[11px] text-[#787D90]">
                Cromado Firefox 150
              </span>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* 3. Sistema Operacional */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Sistema Operacional
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {osList.map((osItem) => {
            const isSelected = formData.os === osItem.id;
            return (
              <Tooltip key={osItem.id} content={osItem.desc} position="top">
                <button
                  type="button"
                  onClick={() => handleSelectOS(osItem.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-all select-none ${
                    isSelected
                      ? 'border-[#2F80ED] bg-[#1D2B44] text-white shadow-sm ring-1 ring-[#2F80ED]/40'
                      : 'border-[#333541] bg-[#1C1D24] text-[#8E93A5] hover:border-[#474A5B] hover:text-[#C5C9D7]'
                  }`}
                >
                  {isSelected && (
                    <span className="text-[11px] leading-none font-bold text-[#2F80ED]">
                      ✓
                    </span>
                  )}
                  <span
                    className={isSelected ? 'text-[#3E8BFF]' : 'text-[#8E93A5]'}
                  >
                    {osItem.icon}
                  </span>
                  <span>{osItem.label}</span>
                  <svg
                    className="h-3 w-3 opacity-60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* 4. User-Agent */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          User-Agent
        </label>
        <div className="flex flex-1 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUaDropdown(!showUaDropdown)}
              className="flex min-w-[84px] cursor-pointer items-center justify-between gap-2 rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] hover:border-[#444756]"
            >
              <span>{formData.userAgentCategory || 'Todo'}</span>
              <svg
                className="h-3.5 w-3.5 opacity-60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showUaDropdown && (
              <div className="absolute top-full left-0 z-20 mt-1 w-28 rounded-md border border-[#363845] bg-[#212229] py-1 shadow-xl">
                {config.userAgentCategories.map((item) => (
                  <div
                    key={item}
                    onClick={() => {
                      onChange('userAgentCategory', item);
                      setShowUaDropdown(false);
                    }}
                    className="cursor-pointer px-3 py-1.5 text-[12px] text-[#C4C7D5] hover:bg-[#2C2E38] hover:text-white"
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-1 items-center overflow-hidden rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-1.5 transition-colors focus-within:border-[#2F80ED]">
            <input
              type="text"
              value={formData.userAgent}
              onChange={(e) => onChange('userAgent', e.target.value)}
              className="mr-2 flex-1 truncate bg-transparent font-mono text-[12px] text-[#D8DAE5] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleShuffleUserAgent}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[#2F80ED] transition-colors hover:bg-[#263145] hover:text-[#4F96FF]"
              title="Sortear outro User-Agent"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 5. * Grupo & Tags */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          <span className="mr-1 font-semibold text-red-500">*</span>Grupo
        </label>
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex w-full cursor-pointer items-center justify-between rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[13px] text-[#C4C7D5] hover:border-[#444756]"
            >
              <span>{formData.group || 'Desagrupado'}</span>
              <svg
                className="h-3.5 w-3.5 opacity-60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showGroupDropdown && (
              <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-[#363845] bg-[#212229] py-1 shadow-xl">
                {config.groups.map((grp) => (
                  <div
                    key={grp.id}
                    onClick={() => {
                      onChange('group', grp.name);
                      setShowGroupDropdown(false);
                    }}
                    className={`cursor-pointer px-3 py-2 text-[12.5px] ${
                      formData.group === grp.name
                        ? 'bg-[#1D2B44] font-medium text-[#3E8BFF]'
                        : 'text-[#C4C7D5] hover:bg-[#2C2E38] hover:text-white'
                    }`}
                  >
                    {grp.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#2F80ED] select-none hover:border-[#2F80ED]/50"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>Tags</span>
            <svg
              className="h-3 w-3 opacity-60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* 6. Cookie */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Cookie
        </label>
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={formData.cookies}
            onChange={(e) => onChange('cookies', e.target.value)}
            placeholder="Formatos: JSON, Netscape, Name=Value"
            className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 text-[12px] text-[#2F80ED] transition-colors select-none hover:text-[#4D97FF]"
            >
              <span>+</span>
              <span>Mesclar cookie</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. Observação */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Observação
        </label>
        <div className="relative flex-1">
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value.slice(0, 2000))}
            placeholder="Indique as notas"
            className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 pr-16 text-[12.5px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-[#6B7082] select-none">
            {formData.notes.length} / 2000
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeralTab;
