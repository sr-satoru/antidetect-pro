import React, { useState, useEffect } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';
import { api } from '@/services/index.api';

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
        className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 pr-9 text-[12.5px] text-white placeholder-[#5C6070] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-[#7E8294] hover:text-white"
        tabIndex={-1}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {show ? (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          ) : (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
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
  return (
    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
      <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
        Verificador de IP
      </label>
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full cursor-pointer items-center justify-between rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] hover:border-[#444756]"
          >
            <span>{value || 'IP2Location'}</span>
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
          {open && (
            <div className="absolute top-full right-0 left-0 z-20 mt-1 rounded-md border border-[#363845] bg-[#212229] py-1 shadow-xl">
              {config.ipCheckers.map((checker) => (
                <div
                  key={checker}
                  onClick={() => {
                    onChange(checker);
                    setOpen(false);
                  }}
                  className="cursor-pointer px-3 py-1.5 text-[12px] text-[#C4C7D5] hover:bg-[#2C2E38] hover:text-white"
                >
                  {checker}
                </div>
              ))}
            </div>
          )}
        </div>
        <span
          className="cursor-pointer text-[#787D90] hover:text-[#B0B4C4]"
          title="Provedor de geolocalização e verificação de IP"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
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

  useEffect(() => {
    const loadProxies = async () => {
      try {
        setIsLoadingProxies(true);
        const list = await api.proxies.list();
        setSavedProxies(list);
      } catch (err) {
        console.error('Erro ao carregar proxies do banco:', err);
      } finally {
        setIsLoadingProxies(false);
      }
    };
    loadProxies();
  }, []);

  const handleSelectSavedProxy = (proxy: any) => {
    setSelectedSavedProxy(proxy);
    onChange('proxyType', proxy.type);
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

  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      {/* Título de seção */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-[#7E8294] select-none">
          Proxy
        </span>
        <div className="h-[1px] flex-1 bg-[#2E303B]" />
      </div>

      {/* 1. Modos de Proxy */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-4">
        <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
          Configuração do proxy
        </label>
        <div className="flex items-center rounded-lg border border-[#333541] bg-[#1C1D24] p-1">
          {config.proxyModes.map((mode) => {
            const isSelected = formData.proxyMode === mode.id;
            return (
              <Tooltip key={mode.id} content={mode.desc} position="top">
                <button
                  type="button"
                  onClick={() => onChange('proxyMode', mode.id)}
                  className={`cursor-pointer rounded-md px-3.5 py-1.5 text-[12.5px] font-medium transition-all select-none ${
                    isSelected
                      ? 'bg-[#383944] text-white shadow-sm'
                      : 'text-[#8E92A2] hover:text-[#C5C9D7]'
                  }`}
                >
                  {mode.label}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* MODO 1: Proxies salvos */}
      {formData.proxyMode === 'saved' && (
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
          <label className="shrink-0 pt-2.5 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
            Escolha um agente
          </label>
          <div className="flex flex-1 items-start gap-2.5">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#8E92A2] select-none hover:text-white"
            >
              <svg
                className="h-3.5 w-3.5 text-white/70"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              </svg>
              <span>Tags</span>
              <svg
                className="ml-0.5 h-3 w-3 opacity-60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className="relative max-w-md flex-1">
              <div
                onClick={() => setShowProxyDropdown(!showProxyDropdown)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-md bg-[#1C1D24] px-3 py-2 transition-all select-none ${
                  showProxyDropdown
                    ? 'border border-white/80 ring-1 ring-white/20'
                    : 'border border-[#333541] hover:border-[#444756]'
                }`}
              >
                <span className="text-[12.5px] text-[#A6ABB9]">
                  {selectedSavedProxy
                    ? `${selectedSavedProxy.name || `${selectedSavedProxy.host}:${selectedSavedProxy.port}`}`
                    : 'Selecione um proxy do banco...'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShuffleSavedProxy}
                    className="p-0.5 text-[#00FF66] transition-colors hover:text-[#00FF66]/80"
                    title="Aleatorizar proxy salvo"
                  >
                    <svg
                      className="h-3.5 w-3.5"
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
                  <svg
                    className={`h-3.5 w-3.5 opacity-60 transition-transform ${showProxyDropdown ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {showProxyDropdown && (
                <div className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[#3E404E] bg-[#23242B] shadow-2xl">
                  <div className="space-y-1 p-1">
                    {savedProxies.length > 0 ? (
                      savedProxies.map((proxy) => (
                        <div
                          key={proxy.id}
                          onClick={() => handleSelectSavedProxy(proxy)}
                          className={`flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors ${
                            selectedSavedProxy?.id === proxy.id
                              ? 'bg-[#2E313D]'
                              : 'hover:bg-[#2A2B35]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#1C1D24] font-mono text-[11px] text-[#8E92A2]">
                              #{proxy.id}
                            </div>
                            <div>
                              <div className="font-mono text-[12.5px] leading-tight text-white">
                                {proxy.name || `${proxy.type}://${proxy.host}:${proxy.port}`}
                              </div>
                              <div className="mt-0.5 text-[11px] text-[#7E8294]">
                                {proxy.type.toUpperCase()} • {proxy.host}:{proxy.port} {proxy.country ? `• ${proxy.country}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="pr-2 text-[12px] font-mono text-[#52C41A]">
                            {proxy.ping ? `${proxy.ping}ms` : 'Ativo'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 px-3 text-center text-xs text-[#8E92A2]">
                        Nenhum proxy cadastrado no banco local.
                        <br />
                        <span className="text-[11px] text-[#606375]">
                          Cadastre proxies na aba "Proxies" para utilizá-los aqui.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODO 2 & 3: Personalizado e Rotativo (compartilham campos com zero duplicação) */}
      {(formData.proxyMode === 'custom' ||
        formData.proxyMode === 'rotating') && (
        <div className="space-y-4 pt-1">
          {/* Protocolo / Tipo proxy */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
              {formData.proxyMode === 'custom' ? 'Tipo proxy' : 'Protocolo'}
            </label>
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-48">
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] hover:border-[#444756]"
                >
                  <span>
                    {formData.proxyType === 'none'
                      ? 'Sem Proxy (Rede local)'
                      : formData.proxyType.toUpperCase()}
                  </span>
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
                {showTypeDropdown && (
                  <div className="absolute top-full right-0 left-0 z-20 mt-1 rounded-md border border-[#363845] bg-[#212229] py-1 shadow-xl">
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
                        className="cursor-pointer px-3 py-2 text-[12px] text-[#C4C7D5] hover:bg-[#2C2E38] hover:text-white"
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
                  className="cursor-pointer rounded-md border border-[#3A3C4B] bg-[#2B2D38] px-3.5 py-2 text-[12px] text-[#C5C8D6] transition-colors select-none hover:bg-[#343744] hover:text-white"
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
                <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
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
                    className="flex-1 rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-white placeholder-[#5C6070] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
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
                    className="w-32 rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-white placeholder-[#5C6070] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
                  />
                  {formData.proxyMode === 'rotating' && (
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-[#3A3C4B] bg-[#2B2D38] px-3.5 py-2 text-[12px] text-[#C5C8D6] transition-colors select-none hover:bg-[#343744] hover:text-white"
                    >
                      Verificar a rede
                    </button>
                  )}
                </div>
              </div>

              {/* Autenticação / Usuário e Senha */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
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
                    className="flex-1 rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-white placeholder-[#5C6070] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
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
                  <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[140px] sm:text-right">
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
                      className="flex-1 rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 font-mono text-[12.5px] text-white placeholder-[#5C6070] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
                    />
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/20 bg-[#262835] px-3.5 py-2 text-[12px] font-medium text-white transition-colors select-none hover:bg-[#323444]"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
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
