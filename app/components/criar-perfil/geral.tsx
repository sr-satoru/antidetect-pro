import React, { useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';
import { Lock, Folder } from 'lucide-react';
import { DropdownSeletorGrupos } from '../grupos/dropdown-seletor-grupos';

interface GeralTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
  isEditing?: boolean;
}

import { OsIcon } from '../ui/os-icon';
import { AstroFoxIcon, AstroBrowserIcon } from '../icons';
import { TagBadge } from '../tags/tag-badge';
import { DropdownSeletorEtiquetas } from '../tags/dropdown-seletor-etiquetas';
import { serviceTags } from '../../services/tags/service.tags';

const renderOSIcon = (os: string): React.ReactNode => {
  return <OsIcon os={os} size={14} className="h-3.5 w-3.5 shrink-0" />;
};

import { getUserAgents, getRandomPreset } from '@/services/navegador-presets';
import { serviceBasePresets } from '@/services/presets/service.base-presets';
import { generateDeviceName, generateMacAddress } from './impressoes';

export const GeralTab: React.FC<GeralTabProps> = ({ formData, onChange, isEditing = false }) => {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showUaDropdown, setShowUaDropdown] = useState(false);
  const [showUaListModal, setShowUaListModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);

  const isAndroid = formData.os === 'android';
  const isChromium = !formData.kernel || formData.kernel === 'AstroBrowser';
  const isFirefox = !isAndroid && formData.kernel === 'AstroFox';

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
    if (formData.os === 'ios') {
      const activePreset = serviceBasePresets.getActivePreset();
      handleSelectOS(activePreset.defaultOS);
    }
    if (formData.os === 'android' && formData.kernel !== 'AstroBrowser') {
      onChange('kernel', 'AstroBrowser');
      onChange('kernelVersion', '135');
    }
  }, [formData.os, formData.kernel]);

  const handleSelectKernel = (newKernel: 'AstroFox' | 'AstroBrowser') => {
    if (isEditing) return; // Motor do navegador é imutável após a criação do perfil
    if (isAndroid && newKernel === 'AstroFox') {
      return; // Android suporta exclusivamente Chromium (AstroBrowser)
    }
    const activePreset = serviceBasePresets.getActivePreset();
    onChange('kernel', newKernel);
    onChange('kernelVersion', '135');
    handleSelectOS(formData.os || activePreset.defaultOS, newKernel);
  };

  const handleSelectOS = (selectedOS: string, selectedKernel?: string) => {
    if (selectedOS === 'ios') return;
    const isTargetAndroid = selectedOS === 'android';
    const activePreset = serviceBasePresets.getActivePreset();
    const effectiveKernel = isTargetAndroid ? 'AstroBrowser' : (selectedKernel || formData.kernel || activePreset.defaultKernel);
    onChange('os', selectedOS);
    if (isTargetAndroid) {
      onChange('kernel', 'AstroBrowser');
      onChange('kernelVersion', '135');
    }
    const preset = getRandomPreset(selectedOS, effectiveKernel);
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
    if (preset.deviceMemory) {
      onChange('deviceMemory', preset.deviceMemory);
    }
    if (preset.userAgentData) {
      onChange('userAgentData', preset.userAgentData);
    }
    onChange('deviceName', generateDeviceName(selectedOS));
    onChange('macAddress', generateMacAddress(selectedOS));
    onChange('screenResolution', 'Com base no User-Agent');
    onChange('mediaDevicesCount', {
      micros: preset.media.mics.length,
      webcams: preset.media.camera ? 1 : 0,
      speakers: preset.media.outs.length,
    });
    onChange('mediaDevicesDetails', preset.media);
  };

  const handleSelectCategory = (cat: string) => {
    setShowUaDropdown(false);
    onChange('userAgentCategory', cat);
    const uas = getUserAgents(formData.os, formData.kernel, cat);
    if (uas.length > 0) {
      onChange('userAgent', uas[0]);
    }
  };

  const handleShuffleUserAgent = () => {
    const uas = getUserAgents(formData.os, formData.kernel, formData.userAgentCategory);
    const currentIdx = uas.indexOf(formData.userAgent);
    const nextIdx = (currentIdx + 1) % uas.length;
    onChange('userAgent', uas[nextIdx]);
  };

  const activeCategoryUas = getUserAgents(formData.os, formData.kernel, formData.userAgentCategory);

  return (
    <div className="flex-1 space-y-4 pr-1 text-slate-800 dark:text-white">
      {/* 1. Nome */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px] sm:text-right">
          Nome
        </label>
        <div className="relative flex-1">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value.slice(0, 100))}
            placeholder="Opcional: nome do perfil"
            className="w-full h-9 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 pr-16 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] transition-colors focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:ring-1 focus:ring-[#7C3AED]/20 focus:outline-none shadow-xs"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-400 dark:text-[#9DA2B4] select-none">
            {formData.name.length} / 100
          </span>
        </div>
      </div>

      {/* 2. Browser Kernel */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex shrink-0 items-center justify-start gap-1.5 pt-2 sm:w-[130px] sm:justify-end">
          <label className="text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none">
            Browser Kernel
          </label>
          {isEditing && (
            <Tooltip
              content="O motor do navegador é imutável após a criação para proteger a integridade dos cookies, sessões salvas e evitar bloqueios por sistemas antifraude."
              position="top"
            >
              <span className="inline-flex items-center text-amber-500 hover:text-amber-600 dark:text-amber-400 cursor-help">
                <Lock size={12} />
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* AstroBrowser Chromium */}
            <Tooltip
              content={
                isEditing
                  ? (isChromium
                      ? 'Motor AstroBrowser configurado para este perfil. Imutável na edição para preservar a sessão e identidade digital.'
                      : 'Não é possível alterar o motor após a criação do perfil.')
                  : 'Motor AstroBrowser (base Blink / Chromium 150): Client Hints nativos, ANGLE GPUs, spoofing de sementes Farble e isolamento de processos.'
              }
              position="top"
            >
              <div className="flex flex-col">
                <div
                  onClick={() => !isEditing && handleSelectKernel('AstroBrowser')}
                  className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 shadow-xs transition-all select-none ${
                    isEditing
                      ? isChromium
                        ? 'cursor-default border-[#7C3AED] dark:border-[#A78BFA] bg-[#7C3AED]/10 dark:bg-[#282A33] text-slate-900 dark:text-white ring-1 ring-[#7C3AED]/20'
                        : 'cursor-not-allowed opacity-35 border-dashed border-slate-300 dark:border-[#2D3039]/40 bg-slate-50 dark:bg-[#1F2026]/40 text-slate-400 dark:text-[#9DA2B4] pointer-events-none'
                      : isChromium
                        ? 'cursor-pointer border-[#7C3AED] dark:border-[#A78BFA] bg-[#7C3AED]/10 dark:bg-[#282A33] text-slate-900 dark:text-white ring-1 ring-[#7C3AED]/20'
                        : 'cursor-pointer border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-600 dark:text-[#9DA2B4] hover:border-slate-300 dark:hover:border-[#4B5063] hover:text-slate-900 dark:hover:text-white dark:hover:bg-[#282A33]'
                  }`}
                >
                  <div className="flex h-5 w-5 items-center justify-center shrink-0">
                    <AstroBrowserIcon size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">AstroBrowser</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                      isChromium
                        ? 'bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/30 dark:bg-white/10 dark:text-white/90 dark:border-white/15'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                    }`}
                  >
                    Chromium 150
                  </span>
                  {isEditing && isChromium ? (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#7C3AED] dark:text-[#A78BFA]">
                      <Lock size={11} />
                      Ativo
                    </span>
                  ) : isChromium ? (
                    <svg
                      className="ml-1 h-3.5 w-3.5 text-[#7C3AED] dark:text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </div>
                <span className="pt-1.5 pl-1 text-[11px] text-slate-500 dark:text-[#9DA2B4]">
                  Base Blink / Chrome 150 · AstroBrowser engine
                </span>
              </div>
            </Tooltip>

            {/* AstroFox Nativo */}
            <Tooltip
              content={
                isEditing
                  ? (isFirefox
                      ? 'Motor AstroFox configurado para este perfil. Imutável na edição para preservar a sessão e identidade digital.'
                      : 'Não é possível alterar o motor após a criação do perfil.')
                  : isAndroid
                    ? 'O motor AstroFox (Firefox Desktop) não possui suporte para emulação de Android. Para perfis Android, utilize exclusivamente o AstroBrowser (Chromium).'
                    : 'Motor AstroFox nativo (base Gecko / Firefox Quantum): evasão avançada de fingerprinting, isolamento de perfis e spoofing de hardware/WebRTC.'
              }
              position="top"
            >
              <div className="flex flex-col">
                <div
                  onClick={() => !isEditing && !isAndroid && handleSelectKernel('AstroFox')}
                  className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 shadow-xs transition-all select-none ${
                    isEditing
                      ? isFirefox
                        ? 'cursor-default border-[#7C3AED] dark:border-[#A78BFA] bg-[#7C3AED]/10 dark:bg-[#282A33] text-slate-900 dark:text-white ring-1 ring-[#7C3AED]/20'
                        : 'cursor-not-allowed opacity-35 border-dashed border-slate-300 dark:border-[#2D3039]/40 bg-slate-50 dark:bg-[#1F2026]/40 text-slate-400 dark:text-[#9DA2B4] pointer-events-none'
                      : isAndroid
                        ? 'cursor-not-allowed opacity-40 border-dashed border-slate-300 dark:border-[#2D3039]/40 bg-slate-50 dark:bg-[#1F2026]/40 text-slate-400 dark:text-[#9DA2B4]'
                        : isFirefox
                          ? 'cursor-pointer border-[#7C3AED] dark:border-[#A78BFA] bg-[#7C3AED]/10 dark:bg-[#282A33] text-slate-900 dark:text-white ring-1 ring-[#7C3AED]/20'
                          : 'cursor-pointer border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-600 dark:text-[#9DA2B4] hover:border-slate-300 dark:hover:border-[#4B5063] hover:text-slate-900 dark:hover:text-white dark:hover:bg-[#282A33]'
                  }`}
                >
                  <div className="flex h-5 w-5 items-center justify-center shrink-0">
                    <AstroFoxIcon size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">AstroFox</span>
                  {isAndroid ? (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold border bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/5 dark:text-slate-500 dark:border-white/10">
                      Desktop Only
                    </span>
                  ) : (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                        isFirefox
                          ? 'bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/30 dark:bg-white/10 dark:text-white/90 dark:border-white/15'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                      }`}
                    >
                      Firefox 150
                    </span>
                  )}
                  {isEditing && isFirefox ? (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#7C3AED] dark:text-[#A78BFA]">
                      <Lock size={11} />
                      Ativo
                    </span>
                  ) : !isAndroid && isFirefox ? (
                    <svg
                      className="ml-1 h-3.5 w-3.5 text-[#7C3AED] dark:text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </div>
                <span className="pt-1.5 pl-1 text-[11px] text-slate-500 dark:text-[#9DA2B4]">
                  {isAndroid
                    ? 'Indisponível em perfil mobile (use AstroBrowser)'
                    : 'Base Gecko / Firefox 150 · AstroFox engine'}
                </span>
              </div>
            </Tooltip>
          </div>

          {isEditing && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-[#9DA2B4]">
              <Lock size={11} className="shrink-0 text-amber-500" />
              <span>O motor do navegador é fixado na criação para proteger os cookies e a coerência de fingerprint. Para utilizar outro motor, clone ou crie um novo perfil.</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sistema Operacional */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px] sm:text-right">
          Sistema Operacional
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {osList.map((osItem) => {
            const isComingSoon = osItem.id === 'ios';
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
                  className={`flex items-center gap-2 rounded-lg border px-3.5 h-9 text-xs font-medium transition-all select-none ${isComingSoon
                      ? 'cursor-not-allowed opacity-50 border-dashed border-slate-300 dark:border-[#2D3039]/40 bg-slate-50 dark:bg-[#1F2026]/40 text-slate-400 dark:text-[#9DA2B4]'
                      : isSelected
                        ? 'cursor-pointer border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] dark:border-[#A78BFA] dark:bg-[#282A33] dark:text-white shadow-xs'
                        : 'cursor-pointer border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-[#2D3039] dark:bg-[#1F2026] dark:text-[#9DA2B4] dark:hover:bg-[#282A33] dark:hover:text-white'
                    }`}
                >
                  {isSelected && (
                    <span className="text-[11px] leading-none font-bold text-[#7C3AED] dark:text-white">
                      ✓
                    </span>
                  )}
                  <span
                    className={isSelected ? 'text-[#7C3AED] dark:text-white' : 'text-slate-500 dark:text-[#9DA2B4]'}
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
        <label className="shrink-0 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px] sm:text-right">
          User-Agent
        </label>
        <div className="flex flex-1 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUaDropdown(!showUaDropdown)}
              className="flex min-w-[88px] h-9 cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3 text-xs text-slate-700 dark:text-[#9DA2B4] hover:border-slate-300 dark:hover:border-[#4B5063] shadow-xs"
            >
              <span>{(formData.userAgentCategory === 'Todo' || !formData.userAgentCategory) ? 'Todos' : formData.userAgentCategory}</span>
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
              <div className="absolute top-full left-0 z-20 mt-1 w-28 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] py-1 shadow-xl">
                {config.userAgentCategories.map((item) => (
                  <div
                    key={item}
                    onClick={() => handleSelectCategory(item)}
                    className={`cursor-pointer px-3 py-1.5 text-xs transition-colors ${(formData.userAgentCategory || 'Todo') === item
                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-semibold dark:bg-[#282A33] dark:text-white'
                        : 'text-slate-700 dark:text-[#9DA2B4] hover:bg-slate-100 dark:hover:bg-[#282A33]/50 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {item === 'Todo' ? 'Todos' : item}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-1 h-9 items-center overflow-hidden rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3 transition-colors focus-within:border-[#7C3AED] dark:focus-within:border-[#A78BFA] focus-within:ring-1 focus-within:ring-[#7C3AED]/20 shadow-xs">
            <input
              type="text"
              value={formData.userAgent}
              onChange={(e) => onChange('userAgent', e.target.value)}
              className="mr-2 flex-1 truncate bg-transparent font-mono text-xs text-slate-800 dark:text-white focus:outline-none"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUaListModal(!showUaListModal)}
                className="cursor-pointer select-none rounded bg-[#7C3AED]/10 dark:bg-[#7C3AED]/15 hover:bg-[#7C3AED]/20 dark:hover:bg-[#7C3AED]/25 px-2 py-0.5 text-[11px] font-semibold text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30 dark:border-[#7C3AED]/40 transition-colors mr-2 flex items-center gap-1"
                title="Clique para ver e escolher entre todas as opções de User-Agent"
              >
                <span>{activeCategoryUas.length} opções</span>
                <svg className="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showUaListModal && (
                <div className="absolute right-0 top-full z-30 mt-1.5 w-80 md:w-96 max-h-64 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-1.5 shadow-2xl">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 dark:text-[#9DA2B4] border-b border-slate-100 dark:border-white/5 mb-1 flex items-center justify-between">
                    <span>User-Agents Disponíveis ({activeCategoryUas.length})</span>
                    <span className="text-[10px] text-[#7C3AED] dark:text-[#A78BFA]">Clique para aplicar</span>
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
                        className={`w-full text-left p-2 rounded-md font-mono text-[11px] transition-colors leading-tight mb-1 cursor-pointer break-all ${isSelected
                            ? 'bg-[#7C3AED]/10 dark:bg-[#282A33] text-[#7C3AED] dark:text-white font-semibold border border-[#7C3AED]/40 dark:border-[#2D3039]'
                            : 'text-slate-700 dark:text-[#9DA2B4] hover:bg-slate-100 dark:hover:bg-[#282A33]/40 hover:text-slate-900 dark:hover:text-white'
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
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-500 dark:text-[#9DA2B4] transition-colors hover:bg-slate-100 dark:hover:bg-[#282A33] hover:text-slate-900 dark:hover:text-white"
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
        <label className="shrink-0 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px] sm:text-right">
          <span className="mr-1 font-semibold text-red-500">*</span>Grupo
        </label>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Campo de Grupo */}
          <div className="relative">
            <button
              type="button"
              data-group-trigger="true"
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className={`flex w-full h-9 cursor-pointer items-center justify-between rounded-lg border px-3.5 text-xs transition-colors select-none shadow-xs ${
                showGroupDropdown || (formData.group && formData.group !== 'Desagrupado')
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] dark:border-[#A78BFA] dark:bg-[#282A33] dark:text-white'
                  : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 dark:border-[#2D3039] dark:bg-[#1F2026] dark:text-[#9DA2B4] dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{formData.group || 'Desagrupado'}</span>
              </div>
              <svg
                className="h-3.5 w-3.5 shrink-0 opacity-60 text-slate-500 dark:text-inherit"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <DropdownSeletorGrupos
              isOpen={showGroupDropdown}
              onClose={() => setShowGroupDropdown(false)}
              selectedGroup={formData.group || 'Desagrupado'}
              onSelectGroup={(grp) => onChange('group', grp)}
              fullWidth
            />
          </div>

          {/* Campo de Tags */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagInput(!showTagInput)}
              className={`flex w-full h-9 cursor-pointer items-center justify-between rounded-lg border px-3.5 text-xs transition-colors select-none shadow-xs ${showTagInput || currentTags.length > 0
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] dark:border-[#A78BFA] dark:bg-[#282A33] dark:text-white'
                  : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 dark:border-[#2D3039] dark:bg-[#1F2026] dark:text-[#9DA2B4] dark:hover:border-white/20'
                }`}
            >
              <div className="flex items-center gap-2 truncate">
                <svg
                  className="h-3.5 w-3.5 shrink-0 opacity-70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span className="truncate">
                  {currentTags.length > 0 ? `Tags (${currentTags.length})` : 'Tags'}
                </span>
              </div>
              <svg
                className="h-3.5 w-3.5 shrink-0 opacity-60 text-slate-500 dark:text-inherit"
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
        <label className="shrink-0 pt-2 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px] sm:text-right">
          Cookie
        </label>
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={formData.cookies}
            onChange={(e) => onChange('cookies', e.target.value)}
            placeholder="Formatos: JSON, Netscape, Name=Value"
            className="w-full h-9 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] transition-colors focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:ring-1 focus:ring-[#7C3AED]/20 focus:outline-none shadow-xs"
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 text-xs text-[#7C3AED] dark:text-[#A78BFA] transition-colors select-none hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] font-medium"
            >
              <span>+</span>
              <span>Mesclar cookie</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. Observação */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px] sm:text-right">
          Observação
        </label>
        <div className="relative flex-1">
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value.slice(0, 2000))}
            placeholder="Indique as notas"
            className="w-full h-9 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 pr-16 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] transition-colors focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:ring-1 focus:ring-[#7C3AED]/20 focus:outline-none shadow-xs"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-slate-400 dark:text-[#9DA2B4] select-none">
            {formData.notes.length} / 2000
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeralTab;
