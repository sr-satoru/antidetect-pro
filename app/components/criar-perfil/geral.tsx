import React, { useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';

interface GeralTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

import { OsIcon } from '../ui/os-icon';
import { FirefoxIcon } from '../ui/firefox-icon';
import { TagBadge } from '../tags/tag-badge';
import { DropdownSeletorEtiquetas } from '../tags/dropdown-seletor-etiquetas';
import { serviceTags } from '../../services/tags/service.tags';

const renderOSIcon = (os: string): React.ReactNode => {
  return <OsIcon os={os} size={14} className="h-3.5 w-3.5 shrink-0" />;
};

import { getUserAgents, getRandomPreset } from '@/services/camoufox-presets';

export const GeralTab: React.FC<GeralTabProps> = ({ formData, onChange }) => {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showUaDropdown, setShowUaDropdown] = useState(false);
  const [showUaListModal, setShowUaListModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);

  const currentTags: string[] = Array.isArray(formData.tags)
    ? formData.tags.map((t: any) => (typeof t === 'string' ? t : t?.name || '')).filter(Boolean)
    : typeof formData.tags === 'string' && formData.tags
    ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    onChange('tags', [...currentTags, trimmed]);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange('tags', currentTags.filter((t) => t !== tagToRemove));
  };

  const osList = config.osOptions.map((item) => ({
    ...item,
    icon: renderOSIcon(item.id),
  }));

  React.useEffect(() => {
    if (formData.os === 'android' || formData.os === 'ios') {
      handleSelectOS('windows');
    }
  }, [formData.os]);

  const handleSelectOS = (selectedOS: string) => {
    if (selectedOS === 'android' || selectedOS === 'ios') return;
    onChange('os', selectedOS);
    const preset = getRandomPreset(selectedOS);
    onChange('userAgent', preset.userAgent);
    onChange('platform', preset.platform);
    onChange('osVersion', preset.osVersion);
    onChange('webglVendor', preset.webglVendor);
    onChange('webglRenderer', preset.webglRenderer);
    onChange('cpuCores', preset.cpuCores);
    onChange('maxTouchPoints', preset.maxTouchPoints);
    onChange('customScreenWidth', preset.customScreenWidth);
    onChange('customScreenHeight', preset.customScreenHeight);
    onChange('devicePixelRatio', preset.devicePixelRatio);
    onChange('colorDepth', preset.colorDepth);
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

  const handleSelectCategory = (_cat: string) => {
    setShowUaDropdown(false);
    const uas = getUserAgents(formData.os);
    if (uas.length > 0) {
      onChange('userAgent', uas[0]);
    }
  };

  const handleShuffleUserAgent = () => {
    const uas = getUserAgents(formData.os);
    const currentIdx = uas.indexOf(formData.userAgent);
    const nextIdx = (currentIdx + 1) % uas.length;
    onChange('userAgent', uas[nextIdx]);
  };

  const activeCategoryUas = getUserAgents(formData.os);

  return (
    <div className="flex-1 space-y-4 pr-1 text-slate-800 dark:text-[#D2D5DF]">
      {/* 1. Nome */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Nome
        </label>
        <div className="relative flex-1">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value.slice(0, 100))}
            placeholder="Opcional: nome do perfil"
            className="w-full rounded-md border border-slate-200 dark:border-[#333541] bg-white dark:bg-[#1C1D24] px-3 py-2 pr-16 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-none shadow-xs"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-400 dark:text-[#6B7082] select-none">
            {formData.name.length} / 100
          </span>
        </div>
      </div>

      {/* 2. Browser Kernel */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2.5 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Browser Kernel
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {/* AstroFox Nativo */}
          <Tooltip
            content="Motor AstroFox nativo (base Gecko / Firefox Quantum): evasão avançada de fingerprinting, isolamento de perfis e spoofing de hardware/WebRTC."
            position="top"
          >
            <div className="flex flex-col">
              <div
                onClick={() => onChange('kernel', 'AstroFox')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-slate-300 dark:border-white/30 bg-slate-100 dark:bg-[#262835] px-4 py-2.5 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-white/10 shadow-xs transition-all select-none"
              >
                <div className="flex h-5 w-5 items-center justify-center shrink-0">
                  <FirefoxIcon size={20} />
                </div>
                <span className="text-[13px] font-semibold text-slate-900 dark:text-white">AstroFox</span>
                <span className="rounded bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-white/90 border border-slate-300 dark:border-white/15">
                  Nativo
                </span>
                <svg
                  className="ml-1 h-3.5 w-3.5 text-slate-900 dark:text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="pt-1.5 pl-1 text-[11px] text-slate-500 dark:text-[#787D90]">
                Base Gecko / Firefox 150 · Motor padrão ativo
              </span>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* 3. Sistema Operacional */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Sistema Operacional
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {osList.map((osItem) => {
            const isComingSoon = osItem.id === 'android' || osItem.id === 'ios';
            const isSelected = formData.os === osItem.id;
            return (
              <Tooltip
                key={osItem.id}
                content={isComingSoon ? `${osItem.label}: Em breve (suporte mobile em desenvolvimento)` : osItem.desc}
                position="top"
              >
                <button
                  type="button"
                  disabled={isComingSoon}
                  onClick={() => !isComingSoon && handleSelectOS(osItem.id)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-all select-none ${
                    isComingSoon
                      ? 'cursor-not-allowed opacity-50 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-400 dark:text-slate-500'
                      : isSelected
                      ? 'cursor-pointer border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-white/30 dark:bg-[#323440] dark:text-white shadow-xs ring-1 ring-emerald-500/20 dark:ring-white/10'
                      : 'cursor-pointer border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-[#333541] dark:bg-[#1C1D24] dark:text-[#8E93A5] dark:hover:border-[#474A5B] dark:hover:text-[#C5C9D7]'
                  }`}
                >
                  {isSelected && (
                    <span className="text-[11px] leading-none font-bold text-emerald-600 dark:text-white">
                      ✓
                    </span>
                  )}
                  <span
                    className={isSelected ? 'text-emerald-700 dark:text-white' : 'text-slate-500 dark:text-[#8E93A5]'}
                  >
                    {osItem.icon}
                  </span>
                  <span>{osItem.label}</span>
                  {isComingSoon ? (
                    <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider">
                      Em breve
                    </span>
                  ) : (
                    <svg
                      className="h-3 w-3 opacity-60"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* 4. User-Agent */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          User-Agent
        </label>
        <div className="flex flex-1 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUaDropdown(!showUaDropdown)}
              className="flex min-w-[88px] cursor-pointer items-center justify-between gap-2 rounded-md border border-slate-200 dark:border-[#333541] bg-white dark:bg-[#1C1D24] px-3 py-2 text-[12.5px] text-slate-700 dark:text-[#C4C7D5] hover:border-slate-300 dark:hover:border-[#444756] shadow-xs"
            >
              <span>{formData.userAgentCategory || 'Todo'}</span>
              <svg
                className="h-3.5 w-3.5 opacity-60 text-slate-500 dark:text-inherit"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showUaDropdown && (
              <div className="absolute top-full left-0 z-20 mt-1 w-28 rounded-md border border-slate-200 dark:border-[#363845] bg-white dark:bg-[#212229] py-1 shadow-xl">
                {config.userAgentCategories.map((item) => (
                  <div
                    key={item}
                    onClick={() => handleSelectCategory(item)}
                    className={`cursor-pointer px-3 py-1.5 text-[12px] transition-colors ${
                      (formData.userAgentCategory || 'Todo') === item
                        ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-[#323440] dark:text-white'
                        : 'text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#2C2E38] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {item === 'Todo' ? 'Todos' : item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-1 items-center overflow-hidden rounded-md border border-slate-200 dark:border-[#333541] bg-white dark:bg-[#1C1D24] px-3 py-1.5 transition-colors focus-within:border-emerald-500 dark:focus-within:border-white/60 focus-within:ring-1 focus-within:ring-emerald-500/20 dark:focus-within:ring-white/15 shadow-xs">
            <input
              type="text"
              value={formData.userAgent}
              onChange={(e) => onChange('userAgent', e.target.value)}
              className="mr-2 flex-1 truncate bg-transparent font-mono text-[12px] text-slate-800 dark:text-[#D8DAE5] focus:outline-none"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUaListModal(!showUaListModal)}
                className="cursor-pointer select-none rounded bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-[#00FF66] border border-emerald-300 dark:border-emerald-500/30 transition-colors mr-2 flex items-center gap-1"
                title="Clique para ver e escolher entre todas as opções de User-Agent"
              >
                <span>{activeCategoryUas.length} opções</span>
                <svg className="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showUaListModal && (
                <div className="absolute right-0 top-full z-30 mt-1.5 w-80 md:w-96 max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-[#3A3D4C] bg-white dark:bg-[#1E1F27] p-1.5 shadow-2xl">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 dark:text-[#7E8294] border-b border-slate-100 dark:border-white/5 mb-1 flex items-center justify-between">
                    <span>User-Agents Disponíveis ({activeCategoryUas.length})</span>
                    <span className="text-[10px] text-emerald-600 dark:text-[#00FF66]">Clique para aplicar</span>
                  </div>
                  {activeCategoryUas.map((ua, idx) => {
                    const isSelected = formData.userAgent === ua;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onChange('userAgent', ua);
                          setShowUaListModal(false);
                        }}
                        className={`w-full text-left p-2 rounded-md font-mono text-[11px] transition-colors leading-tight mb-1 cursor-pointer break-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-[#00FF66]/10 text-emerald-700 dark:text-[#00FF66] font-semibold border border-emerald-300 dark:border-[#00FF66]/30'
                            : 'text-slate-700 dark:text-[#C5C8D6] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {ua}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleShuffleUserAgent}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-500 dark:text-white/80 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              title={`Sortear outro User-Agent (${activeCategoryUas.length} disponíveis)`}
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
        <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          <span className="mr-1 font-semibold text-red-500">*</span>Grupo
        </label>
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex w-full cursor-pointer items-center justify-between rounded-md border border-slate-200 dark:border-[#333541] bg-white dark:bg-[#1C1D24] px-3 py-2 text-[13px] text-slate-700 dark:text-[#C4C7D5] hover:border-slate-300 dark:hover:border-[#444756] shadow-xs"
            >
              <span>{formData.group || 'Desagrupado'}</span>
              <svg
                className="h-3.5 w-3.5 opacity-60 text-slate-500 dark:text-inherit"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showGroupDropdown && (
              <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-[#363845] bg-white dark:bg-[#212229] py-1 shadow-xl">
                {config.groups.map((grp) => (
                  <div
                    key={grp.id}
                    onClick={() => {
                      onChange('group', grp.name);
                      setShowGroupDropdown(false);
                    }}
                    className={`cursor-pointer px-3 py-2 text-[12.5px] ${
                      formData.group === grp.name
                        ? 'bg-blue-50 font-medium text-blue-700 dark:bg-[#1D2B44] dark:text-[#3E8BFF]'
                        : 'text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#2C2E38] hover:text-slate-900 dark:hover:text-white'
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
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[12.5px] transition-colors select-none shadow-xs ${
                showTagInput || currentTags.length > 0
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-white/30 dark:bg-[#282935] dark:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-[#333541] dark:bg-[#1C1D24] dark:text-[#C4C7D5] dark:hover:border-white/20'
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
                className="h-3 w-3 opacity-60 text-slate-500 dark:text-inherit"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <DropdownSeletorEtiquetas
              isOpen={showTagInput}
              onClose={() => setShowTagInput(false)}
              selectedTags={currentTags}
              onToggleTag={(tagName) => {
                if (currentTags.includes(tagName)) {
                  handleRemoveTag(tagName);
                } else {
                  handleAddTag(tagName);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Badges de Tags ativas visíveis */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:pl-[146px]">
          {currentTags.map((tag) => (
            <TagBadge
              key={tag}
              name={tag}
              color={serviceTags.getColorByName(tag)}
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
        </div>
      )}

      {/* 6. Cookie */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Cookie
        </label>
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={formData.cookies}
            onChange={(e) => onChange('cookies', e.target.value)}
            placeholder="Formatos: JSON, Netscape, Name=Value"
            className="w-full rounded-md border border-slate-200 dark:border-[#333541] bg-white dark:bg-[#1C1D24] px-3 py-2 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-none shadow-xs"
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 text-[12px] text-emerald-600 dark:text-[#00FF66] transition-colors select-none hover:text-emerald-700 dark:hover:text-[#00FF66]/80 font-medium"
            >
              <span>+</span>
              <span>Mesclar cookie</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. Observação */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Observação
        </label>
        <div className="relative flex-1">
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value.slice(0, 2000))}
            placeholder="Indique as notas"
            className="w-full rounded-md border border-slate-200 dark:border-[#333541] bg-white dark:bg-[#1C1D24] px-3 py-2 pr-16 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-none shadow-xs"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-400 dark:text-[#6B7082] select-none">
            {formData.notes.length} / 2000
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeralTab;
