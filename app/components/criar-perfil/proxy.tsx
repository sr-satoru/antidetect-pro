import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';
import { api } from '@/services/index.api';
import {
  Globe,
  Shuffle,
  ChevronDown,
  Search,
  X,
  Eye,
  EyeOff,
  RotateCw,
  Tag,
  HelpCircle,
  Check,
} from 'lucide-react';

interface ProxyTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

// Subcomponente reutilizável para campo de Senha com alternância de visualização
const PasswordInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Senha (opcional)' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex-1">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 pr-9 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-slate-400 dark:text-[#7E8294] transition-colors hover:text-slate-900 dark:hover:text-white"
        tabIndex={-1}
        title={show ? 'Ocultar senha' : 'Ver senha'}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
};

// Subcomponente reutilizável para o Verificador de IP
const IpCheckerField: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
      <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
        Verificador de IP
      </label>
      <div className="flex items-center gap-2">
        <div ref={containerRef} className="relative w-48">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full cursor-pointer items-center justify-between rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-[12.5px] text-slate-700 dark:text-[#C4C7D5] transition-colors hover:border-slate-300 dark:hover:border-white/25 shadow-xs"
          >
            <span>{value || 'IP2Location'}</span>
            <ChevronDown
              size={14}
              className={`opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
          {open && (
            <div className="absolute top-full right-0 left-0 z-30 mt-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] py-1 shadow-2xl">
              {config.ipCheckers.map((checker) => (
                <div
                  key={checker}
                  onClick={() => {
                    onChange(checker);
                    setOpen(false);
                  }}
                  className={`cursor-pointer px-3 py-1.5 text-[12px] transition-colors ${
                    value === checker
                      ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-white/[0.08] dark:text-white'
                      : 'text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {checker}
                </div>
              ))}
            </div>
          )}
        </div>
        <span
          className="cursor-pointer text-slate-400 dark:text-[#787D90] transition-colors hover:text-slate-900 dark:hover:text-white"
          title="Provedor de geolocalização e verificação de IP"
        >
          <HelpCircle size={15} />
        </span>
      </div>
    </div>
  );
};

export const ProxyTab: React.FC<ProxyTabProps> = ({ formData, onChange }) => {
  const [showProxyDropdown, setShowProxyDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedSavedProxy, setSelectedSavedProxy] = useState<any>(null);
  const [savedProxies, setSavedProxies] = useState<any[]>([]);
  const [isLoadingProxies, setIsLoadingProxies] = useState(false);
  const [proxySearch, setProxySearch] = useState('');

  const proxyDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        proxyDropdownRef.current &&
        !proxyDropdownRef.current.contains(e.target as Node)
      ) {
        setShowProxyDropdown(false);
      }
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Carrega proxies do SQLite
  useEffect(() => {
    const loadProxies = async () => {
      try {
        setIsLoadingProxies(true);
        const list = await api.proxies.list();
        const safeList = Array.isArray(list) ? list : [];
        setSavedProxies(safeList);

        // Se já tiver host e port configurados no formulário, sincroniza a seleção visual
        if (formData.proxyHost && formData.proxyPort) {
          const match = safeList.find(
            (p: any) =>
              p.host === formData.proxyHost &&
              String(p.port) === String(formData.proxyPort)
          );
          if (match) {
            setSelectedSavedProxy(match);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar proxies do banco:', err);
      } finally {
        setIsLoadingProxies(false);
      }
    };
    loadProxies();
  }, [formData.proxyHost, formData.proxyPort]);

  const handleSelectSavedProxy = (proxy: any) => {
    setSelectedSavedProxy(proxy);
    onChange('proxyType', proxy.type || proxy.proxy_type || 'http');
    onChange('proxyHost', proxy.host);
    onChange('proxyPort', proxy.port);
    onChange('proxyUser', proxy.user || '');
    onChange('proxyPass', proxy.pass || '');
    setShowProxyDropdown(false);
  };

  const handleShuffleSavedProxy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedProxies.length > 0) {
      const random =
        savedProxies[Math.floor(Math.random() * savedProxies.length)];
      handleSelectSavedProxy(random);
    }
  };

  // Filtro de pesquisa no dropdown de proxies salvos
  const filteredSavedProxies = useMemo(() => {
    if (!proxySearch.trim()) return savedProxies;
    const q = proxySearch.toLowerCase();
    return savedProxies.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.host && p.host.toLowerCase().includes(q)) ||
        (p.type && p.type.toLowerCase().includes(q)) ||
        (p.proxy_type && p.proxy_type.toLowerCase().includes(q)) ||
        (p.country && p.country.toLowerCase().includes(q))
    );
  }, [savedProxies, proxySearch]);

  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      {/* Título de seção */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-slate-500 dark:text-[#7E8294] select-none">
          Proxy
        </span>
        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      {/* 1. Modos de Proxy */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
          Configuração do proxy
        </label>
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#14151B] p-1 gap-1 shadow-2xs">
          {config.proxyModes.map((mode) => {
            const isSelected = formData.proxyMode === mode.id;
            return (
              <Tooltip key={mode.id} content={mode.desc} position="top">
                <button
                  type="button"
                  onClick={() => onChange('proxyMode', mode.id)}
                  className={`cursor-pointer rounded-md px-3.5 py-1.5 text-[12.5px] font-medium transition-all select-none ${
                    isSelected
                      ? 'bg-white text-slate-900 border border-slate-300 dark:border-transparent dark:bg-white/10 font-semibold dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#8E92A2] dark:hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* MODO 1: Salvo (Puxa do banco SQLite local de proxies) */}
      {formData.proxyMode === 'saved' && (
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
          <label className="shrink-0 pt-2.5 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
            Proxy Salvo
          </label>
          <div className="flex flex-1 items-start gap-2.5">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-[12.5px] text-slate-600 dark:text-[#8E92A2] transition-colors select-none hover:border-slate-300 dark:hover:border-white/25 hover:text-slate-900 dark:hover:text-white shadow-xs"
            >
              <Tag size={13} className="text-slate-500 dark:text-white/70" />
              <span>Tags</span>
              <ChevronDown size={12} className="opacity-60" />
            </button>

            {/* Container Relativo do Seletor */}
            <div ref={proxyDropdownRef} className="relative max-w-md flex-1">
              <div
                onClick={() => setShowProxyDropdown(!showProxyDropdown)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-md bg-white dark:bg-[#14151B] px-3.5 py-2 transition-all select-none shadow-xs ${
                  showProxyDropdown
                    ? 'border border-emerald-500 dark:border-white/40 ring-1 ring-emerald-500/20 dark:ring-white/10'
                    : 'border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <Globe
                    size={15}
                    className={`shrink-0 transition-colors ${
                      selectedSavedProxy ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#7E8294]'
                    }`}
                  />
                  <span
                    className={`truncate text-[12.5px] ${
                      selectedSavedProxy
                        ? 'font-semibold text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-[#8E92A2]'
                    }`}
                  >
                    {selectedSavedProxy
                      ? `${selectedSavedProxy.name || `${selectedSavedProxy.host}:${selectedSavedProxy.port}`}`
                      : 'Selecione um proxy do banco...'}
                  </span>
                  {selectedSavedProxy && (
                    <span className="rounded bg-emerald-50 text-emerald-700 dark:bg-[#00FF66]/10 px-1.5 py-0.5 font-mono text-[10px] font-bold dark:text-[#00FF66] border border-emerald-200 dark:border-[#00FF66]/20 shrink-0 uppercase">
                      {(selectedSavedProxy.type || selectedSavedProxy.proxy_type || 'HTTP').toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleShuffleSavedProxy}
                    className="cursor-pointer rounded p-1 text-emerald-600 dark:text-[#00FF66] transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                    title="Sortear aleatoriamente um proxy salvo"
                  >
                    <Shuffle size={14} />
                  </button>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 dark:text-[#8E92A2] transition-transform ${
                      showProxyDropdown ? 'rotate-180 text-slate-900 dark:text-white' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Menu Dropdown de Proxies */}
              {showProxyDropdown && (
                <div className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] shadow-2xl [scrollbar-width:thin]">
                  {/* Busca se houver mais de 3 proxies */}
                  {savedProxies.length > 3 && (
                    <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] p-2">
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-2.5 py-1.5 text-xs">
                        <Search size={13} className="shrink-0 text-slate-400 dark:text-[#8E92A2]" />
                        <input
                          type="text"
                          placeholder="Buscar por nome, host, tipo..."
                          value={proxySearch}
                          onChange={(e) => setProxySearch(e.target.value)}
                          className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#686C7E] outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {proxySearch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProxySearch('');
                            }}
                            className="text-slate-400 dark:text-[#8E92A2] hover:text-slate-900 dark:hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 p-1.5">
                    {savedProxies.length === 0 ? (
                      <div className="py-6 px-4 text-center text-xs text-slate-500 dark:text-[#8E92A2]">
                        Nenhum proxy cadastrado no banco local.
                        <br />
                        <span className="mt-1 inline-block text-[11px] text-slate-400 dark:text-[#606375]">
                          Cadastre proxies na aba "Proxies" para utilizá-los aqui.
                        </span>
                      </div>
                    ) : filteredSavedProxies.length === 0 ? (
                      <div className="py-5 px-3 text-center text-xs text-slate-500 dark:text-[#8E92A2]">
                        Nenhum proxy encontrado para "{proxySearch}".
                      </div>
                    ) : (
                      filteredSavedProxies.map((proxy, index) => {
                        const isSelected =
                          selectedSavedProxy?.id === proxy.id ||
                          (formData.proxyHost === proxy.host &&
                            String(formData.proxyPort) === String(proxy.port));
                        const protocol = (
                          proxy.type ||
                          proxy.proxy_type ||
                          'HTTP'
                        ).toUpperCase();

                        return (
                          <div
                            key={proxy.id || index}
                            onClick={() => handleSelectSavedProxy(proxy)}
                            className={`group relative flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-all select-none ${
                              isSelected
                                ? 'border border-[#238636]/40 bg-emerald-50/70 text-emerald-950 dark:border-[#238636]/50 dark:bg-emerald-950/25 shadow-xs'
                                : 'border border-slate-100 hover:bg-slate-50 dark:border-white/[0.04] dark:bg-white/[0.015] dark:hover:border-white/10 dark:hover:bg-white/[0.04]'
                            }`}
                          >
                            {/* Indicador vertical no item selecionado */}
                            {isSelected && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#238636] dark:bg-[#2ea043]" />
                            )}

                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Badge de Protocolo */}
                              <span
                                className={`flex shrink-0 items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-[#00FF66]/15 dark:text-[#00FF66] border border-emerald-300 dark:border-[#00FF66]/30'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/[0.06] dark:text-[#A6ABB9] dark:border-white/10 group-hover:text-slate-900 dark:group-hover:text-white'
                                }`}
                              >
                                {protocol}
                              </span>

                              {/* Nome e Detalhes do Proxy */}
                              <div className="min-w-0 flex-1">
                                <div
                                  className={`truncate font-mono text-[12.5px] leading-tight transition-colors ${
                                    isSelected
                                      ? 'font-bold text-slate-900 dark:text-white'
                                      : 'font-medium text-slate-800 dark:text-[#E1E4EE] group-hover:text-slate-900 dark:group-hover:text-white'
                                  }`}
                                >
                                  {proxy.name || `${proxy.host}:${proxy.port}`}
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-slate-500 dark:text-[#7E8294]">
                                  <span className="font-mono">{proxy.host}:{proxy.port}</span>
                                  {proxy.country && (
                                    <>
                                      <span className="text-slate-300 dark:text-[#4E5160]">•</span>
                                      <span className="text-slate-600 dark:text-white/60">{proxy.country}</span>
                                    </>
                                  )}
                                  {proxy.user && (
                                    <>
                                      <span className="text-slate-300 dark:text-[#4E5160]">•</span>
                                      <span className="text-slate-500 dark:text-[#7E8294] truncate">user: {proxy.user}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Lado Direito: Badge Selecionado ou Ping */}
                            <div className="flex shrink-0 items-center gap-2 pl-2">
                              {isSelected ? (
                                <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-[#00FF66]/30 dark:bg-[#00FF66]/15 px-2 py-0.5 font-mono text-[11px] font-semibold dark:text-[#00FF66] shadow-xs">
                                  <Check size={11} strokeWidth={3} />
                                  <span>Selecionado</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 dark:text-[#7E8294] group-hover:text-slate-700 dark:group-hover:text-white/70">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-white/20 group-hover:bg-emerald-500 dark:group-hover:bg-[#00FF66]" />
                                  <span>{proxy.ping ? `${proxy.ping}ms` : 'Disponível'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODO 2 & 3: Personalizado e Rotativo */}
      {(formData.proxyMode === 'custom' ||
        formData.proxyMode === 'rotating') && (
        <div className="space-y-4 pt-1">
          {/* Protocolo / Tipo proxy */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
              {formData.proxyMode === 'custom' ? 'Tipo proxy' : 'Protocolo'}
            </label>
            <div className="flex flex-1 items-center gap-3">
              <div ref={typeDropdownRef} className="relative w-48">
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-[12.5px] text-slate-700 dark:text-[#C4C7D5] transition-colors hover:border-slate-300 dark:hover:border-white/25 shadow-xs"
                >
                  <span>
                    {formData.proxyType === 'none'
                      ? 'Sem Proxy (Rede local)'
                      : formData.proxyType.toUpperCase()}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`opacity-60 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
                {showTypeDropdown && (
                  <div className="absolute top-full right-0 left-0 z-30 mt-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] py-1 shadow-2xl">
                    {(formData.proxyMode === 'custom'
                      ? config.proxyTypes
                      : config.rotatingProtocols.map((p) => ({
                          id: p,
                          label: p.toUpperCase(),
                        }))
                    ).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onChange('proxyType', item.id);
                          setShowTypeDropdown(false);
                        }}
                        className={`cursor-pointer px-3 py-2 text-[12px] transition-colors ${
                          formData.proxyType === item.id
                            ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-white/[0.08] dark:text-white'
                            : 'text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formData.proxyMode === 'custom' && (
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.05] px-3.5 py-2 text-[12px] font-medium text-slate-700 dark:text-white transition-colors select-none hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.98] shadow-xs"
                >
                  Verificar a rede
                </button>
              )}
            </div>
          </div>

          {/* Host e Porta */}
          {formData.proxyType !== 'none' && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
                  Host e Porta
                </label>
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="text"
                    value={formData.proxyHost}
                    onChange={(e) => onChange('proxyHost', e.target.value)}
                    placeholder={
                      formData.proxyMode === 'rotating'
                        ? 'ex: rotating.proxyprovider.com'
                        : 'ex: 151.245.245.179'
                    }
                    className="flex-1 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
                  />
                  <input
                    type="text"
                    value={formData.proxyPort}
                    onChange={(e) => onChange('proxyPort', e.target.value)}
                    placeholder={
                      formData.proxyMode === 'rotating'
                        ? 'Porta (ex: 8080)'
                        : 'Porta (ex: 50101)'
                    }
                    className="w-32 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
                  />
                  {formData.proxyMode === 'rotating' && (
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.05] px-3.5 py-2 text-[12px] font-medium text-slate-700 dark:text-white transition-colors select-none hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.98] shadow-xs"
                    >
                      Verificar a rede
                    </button>
                  )}
                </div>
              </div>

              {/* Autenticação / Usuário e Senha */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
                  {formData.proxyMode === 'rotating'
                    ? 'Autenticação'
                    : 'Usuário e Senha'}
                </label>
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="text"
                    value={formData.proxyUser}
                    onChange={(e) => onChange('proxyUser', e.target.value)}
                    placeholder="Usuário (opcional)"
                    className="flex-1 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
                  />
                  <PasswordInput
                    value={formData.proxyPass}
                    onChange={(val) => onChange('proxyPass', val)}
                  />
                </div>
              </div>

              {/* Campo exclusivo do modo rotativo: Link de troca de IP */}
              {formData.proxyMode === 'rotating' && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <label className="shrink-0 text-left text-[13px] text-slate-600 dark:text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
                    Link de troca de IP
                  </label>
                  <div className="flex flex-1 items-center gap-3">
                    <input
                      type="text"
                      value={formData.proxyRotationUrl}
                      onChange={(e) =>
                        onChange('proxyRotationUrl', e.target.value)
                      }
                      placeholder="https://api.proxyprovider.com/rotate?key=xyz..."
                      className="flex-1 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] px-3 py-2 font-mono text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-none shadow-xs"
                    />
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.05] px-3.5 py-2 text-[12px] font-medium text-slate-700 dark:text-white transition-colors select-none hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.98] shadow-xs"
                    >
                      <RotateCw size={13} />
                      <span>Rotacionar IP</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Verificador de IP compartilhado */}
              <IpCheckerField
                value={formData.ipChecker}
                onChange={(checker) => onChange('ipChecker', checker)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProxyTab;
