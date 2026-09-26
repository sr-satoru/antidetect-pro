import React, { useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';

interface GeralTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

import { generateRandomDeviceName, generateRandomSeed } from '@/utils';
import { OsIcon } from '../ui/os-icon';

const renderOSIcon = (os: string): React.ReactNode => {
  return <OsIcon os={os} size={14} className="h-3.5 w-3.5 shrink-0" />;
};

export const GeralTab: React.FC<GeralTabProps> = ({ formData, onChange }) => {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showUaDropdown, setShowUaDropdown] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  const currentTags: string[] = Array.isArray(formData.tags)
    ? formData.tags
    : typeof formData.tags === 'string' && formData.tags
    ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    onChange('tags', [...currentTags, trimmed]);
    setNewTagText('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange('tags', currentTags.filter((t) => t !== tagToRemove));
  };

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
          {/* Camoufox Nativo */}
          <Tooltip
            content="Motor Camoufox nativo (base Gecko / Firefox 150): evasão avançada de fingerprinting, isolamento de perfis e spoofing de hardware/WebRTC."
            position="top"
          >
            <div className="flex flex-col">
              <div
                onClick={() => onChange('kernel', 'Camoufox')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-[#2F80ED] bg-[#192233] px-4 py-2.5 text-white ring-1 ring-[#2F80ED]/30 transition-all select-none"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF7A00] to-[#E65100] text-[11px] font-bold text-white shadow-sm">
                  🦊
                </div>
                <span className="text-[13px] font-semibold text-white">Camoufox</span>
                <span className="rounded bg-[#2F80ED]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#64B5F6]">
                  Nativo
                </span>
                <svg
                  className="ml-1 h-3.5 w-3.5 text-[#2F80ED]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="pt-1.5 pl-1 text-[11px] text-[#787D90]">
                Base Gecko / Firefox 150 · Motor padrão ativo
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagInput(!showTagInput)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[12.5px] transition-colors select-none ${
                showTagInput || currentTags.length > 0
                  ? 'border-[#2F80ED] bg-[#1D2536] text-white'
                  : 'border-[#333541] bg-[#1C1D24] text-[#2F80ED] hover:border-[#2F80ED]/50'
              }`}
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
              <span>Tags {currentTags.length > 0 && `(${currentTags.length})`}</span>
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

            {showTagInput && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-64 rounded-md border border-[#363845] bg-[#212229] p-2.5 shadow-xl">
                <div className="flex items-center gap-1.5 pb-2">
                  <input
                    type="text"
                    value={newTagText}
                    onChange={(e) => setNewTagText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagText);
                      }
                    }}
                    placeholder="Adicionar tag e dar Enter..."
                    className="flex-1 rounded border border-[#3A3D4D] bg-[#17181F] px-2 py-1 text-[12px] text-white placeholder-[#686D80] focus:border-[#2F80ED] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagText)}
                    className="cursor-pointer rounded bg-[#2F80ED] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#256ECC]"
                  >
                    +
                  </button>
                </div>
                {currentTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-1">
                    {currentTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded bg-[#2A3142] px-2 py-0.5 text-[11px] text-[#A8C7FA]"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="cursor-pointer text-[#8C93A8] hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#717688]">Nenhuma tag adicionada.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badges de Tags ativas visíveis */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:pl-[146px]">
          {currentTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 rounded-full border border-[#2F80ED]/30 bg-[#1D2536] px-2.5 py-0.5 text-[11.5px] font-medium text-[#99C5FF]"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="cursor-pointer text-[#6B7898] transition-colors hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

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
