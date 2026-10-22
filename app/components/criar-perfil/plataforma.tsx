import React, { useState, useRef, useEffect } from 'react';
import { Tooltip, InfoBalloon } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';
import { PlatformBrandIcon } from '@/components/ui/platform-cell';

interface PlataformaTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

export const PLATFORM_PRESETS = config.platforms.map((p) => ({
  ...p,
  icon: <PlatformBrandIcon platform={p.id} size="xs" />,
}));

export const PlataformaTab: React.FC<PlataformaTabProps> = ({
  formData,
  onChange,
}) => {
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [openCardDropdownIdx, setOpenCardDropdownIdx] = useState<number | null>(
    null,
  );

  const addDropdownRef = useRef<HTMLDivElement | null>(null);

  const accounts = formData.platformAccounts || [];

  // Fechar dropdown de adicionar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addDropdownRef.current &&
        !addDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAddDropdownOpen(false);
      }
    };
    if (isAddDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddDropdownOpen]);

  const formatDomainToUrl = (domain?: string): string => {
    if (!domain) return '';
    const trimmed = domain.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  // Adicionar uma nova conta selecionando a plataforma do dropdown
  const handleSelectPlatformToAdd = (preset: any) => {
    const domain = preset.requiresCustomDomain ? '' : preset.domain;
    const newAccount = {
      id: String(Date.now()),
      platform: preset.id,
      customDomain: domain,
      username: '',
      password: '',
      twoFactorKey: '',
    };
    const updated = [...accounts, newAccount];
    onChange('platformAccounts', updated);

    // Registra a URL da plataforma selecionada de forma independente
    if (domain) {
      onChange('platformUrl', formatDomainToUrl(domain));
    }
    setIsAddDropdownOpen(false);
  };

  const handleRemoveAccount = (index: number) => {
    const updated = accounts.filter((_: any, i: number) => i !== index);
    onChange('platformAccounts', updated);
    if (updated.length === 0) {
      onChange('platformUrl', '');
    } else {
      const firstDomain = updated[0]?.customDomain;
      if (firstDomain) {
        onChange('platformUrl', formatDomainToUrl(firstDomain));
      }
    }
  };

  const handleUpdateAccount = (index: number, updates: any) => {
    const updated = accounts.map((acc: any, i: number) => {
      if (i !== index) return acc;
      const merged = { ...acc, ...updates };
      if (updates.platform) {
        const preset = PLATFORM_PRESETS.find((p) => p.id === updates.platform);
        if (preset && !preset.requiresCustomDomain) {
          merged.customDomain = preset.domain;
        }
      }
      return merged;
    });
    onChange('platformAccounts', updated);

    const changedDomain = updated[index]?.customDomain;
    if (changedDomain && changedDomain.trim()) {
      onChange('platformUrl', formatDomainToUrl(changedDomain));
    }
  };

  const duplicateRules = formData.duplicateCheckRules || {
    usernamePassword: true,
    cookie: true,
    cUser: true,
  };

  const handleToggleRule = (
    ruleKey: 'usernamePassword' | 'cookie' | 'cUser',
  ) => {
    const updated = {
      ...duplicateRules,
      [ruleKey]: !duplicateRules[ruleKey],
    };
    onChange('duplicateCheckRules', updated);
  };

  return (
    <div className="flex-1 space-y-5 pr-1 text-slate-800 dark:text-[#D2D5DF]">
      {/* 1. Título de Seção com divisor */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-slate-500 dark:text-[#9DA2B4] select-none">
          Plataforma
        </span>
        <div className="h-[1px] flex-1 bg-slate-200/80 dark:bg-[#2D3039]" />
      </div>

      {/* 2. Área de Plataforma */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[140px] sm:text-right">
          Plataforma
        </label>

        <div className="max-w-2xl flex-1 space-y-4">
          {/* Cards das contas adicionadas com a lixeira ao lado */}
          {accounts.map((acc: any, idx: number) => {
            const currentPreset =
              PLATFORM_PRESETS.find((p) => p.id === acc.platform) ||
              PLATFORM_PRESETS.find((p) => p.id === 'other')!;
            const isOther =
              currentPreset.requiresCustomDomain || acc.platform === 'other';
            const isDomainEmpty =
              isOther && (!acc.customDomain || acc.customDomain.trim() === '');

            return (
              <div
                key={acc.id || idx}
                className="flex w-full items-center gap-3"
              >
                {/* O Card do formulário */}
                <div className="relative flex-1 space-y-3.5 rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-slate-50 dark:bg-[#1F2026] p-4 shadow-xs sm:p-5">
                  {/* Linha 1: Seletor da Plataforma */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px]">
                      Plataforma {idx + 1}
                    </span>

                    <div className="relative max-w-md flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCardDropdownIdx(
                            openCardDropdownIdx === idx ? null : idx,
                          )
                        }
                        className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 text-xs text-slate-800 dark:text-white hover:border-slate-400 dark:hover:border-[#4B5063] shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          {currentPreset.icon}
                          <span>{currentPreset.name}</span>
                        </div>
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

                      {/* Dropdown de troca de plataforma dentro do card */}
                      {openCardDropdownIdx === idx && (
                        <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] py-1.5 shadow-2xl">
                          {PLATFORM_PRESETS.map((preset) => (
                            <div
                              key={preset.id}
                              onClick={() => {
                                handleUpdateAccount(idx, {
                                  platform: preset.id,
                                });
                                setOpenCardDropdownIdx(null);
                              }}
                              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors ${
                                acc.platform === preset.id
                                  ? 'bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-[#282A33] font-medium dark:text-white'
                                  : 'text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#282A33]/50 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {preset.icon}
                              <span>{preset.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Se 'other' for selecionado: Campo de Domínio Obrigatório com validação vermelha */}
                  {isOther && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                      <span className="shrink-0 pt-2 text-xs text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px]" />
                      <div className="max-w-md flex-1">
                        <input
                          type="text"
                          value={acc.customDomain || ''}
                          onChange={(e) =>
                            handleUpdateAccount(idx, {
                              customDomain: e.target.value,
                            })
                          }
                          placeholder="Indique por favor o domínio da plataforma"
                          className={`h-9 w-full rounded-lg border bg-white dark:bg-[#1F2026] px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A6A9B6] transition-colors focus:outline-none shadow-2xs ${
                            isDomainEmpty
                              ? 'border-[#EF4444] focus:border-[#EF4444]'
                              : 'border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA]'
                          }`}
                        />
                        {isDomainEmpty && (
                          <span className="mt-1 block text-[11px] text-[#EF4444]">
                            Indique por favor o domínio da plataforma
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linha 2: Nome do Utilizador */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px]">
                      Nome do Utilizador
                    </span>
                    <div className="max-w-md flex-1">
                      <input
                        type="text"
                        value={acc.username || ''}
                        onChange={(e) =>
                          handleUpdateAccount(idx, { username: e.target.value })
                        }
                        placeholder="Indique por favor o nome do utilizador"
                        className="h-9 w-full rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A6A9B6] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Linha 3: Senha */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px]">
                      Senha
                    </span>
                    <div className="max-w-md flex-1">
                      <input
                        type="text"
                        value={acc.password || ''}
                        onChange={(e) =>
                          handleUpdateAccount(idx, { password: e.target.value })
                        }
                        placeholder="Digite a senha"
                        className="h-9 w-full rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 font-mono text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A6A9B6] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Linha 4: Chave 2FA */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[130px]">
                      chave 2FA.
                    </span>
                    <div className="relative max-w-md flex-1">
                      <input
                        type="text"
                        value={acc.twoFactorKey || ''}
                        onChange={(e) =>
                          handleUpdateAccount(idx, {
                            twoFactorKey: e.target.value,
                          })
                        }
                        placeholder="Por favor, digite a chave."
                        className="h-9 w-full rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 pr-9 font-mono text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A6A9B6] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none shadow-2xs"
                      />
                      <Tooltip
                        content="Chave secreta TOTP para geração automática do código de dois fatores ao fazer login."
                        position="top"
                      >
                        <div className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-help text-slate-400 dark:text-[#9DA2B4] hover:text-slate-600 dark:hover:text-white">
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Ícone lixeira posicionado AO LADO do card */}
                <button
                  type="button"
                  onClick={() => handleRemoveAccount(idx)}
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-slate-400 dark:text-[#9DA2B4] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-[#EF4444]"
                  title="Remover conta da plataforma"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Botão tracejado com Dropdown de seleção de plataforma ancorado abaixo */}
          <div className="relative" ref={addDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
              className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-[#2D3039] bg-slate-100/70 hover:bg-slate-200/70 dark:bg-[#1F2026] dark:hover:bg-[#282A33] px-4 text-xs font-medium text-slate-600 dark:text-[#9DA2B4] transition-all select-none hover:text-slate-900 dark:hover:text-white"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#7C3AED] dark:border-[#A78BFA] text-xs leading-none font-bold text-[#7C3AED] dark:text-[#A78BFA]">
                +
              </div>
              <span>Adicionar conta da plataforma</span>
            </button>

            {/* Menu Dropdown de plataformas */}
            {isAddDropdownOpen && (
              <div className="absolute top-full right-0 left-0 z-40 mt-1 max-h-72 [scrollbar-width:thin] overflow-y-auto rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] py-1.5 shadow-2xl">
                {PLATFORM_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPlatformToAdd(preset)}
                    className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-[#C4C7D5] transition-colors hover:bg-slate-100 dark:hover:bg-[#282A33] hover:text-slate-900 dark:hover:text-white"
                  >
                    {preset.icon}
                    <span>{preset.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Seção: Verificar duplicado (apenas exibida se houver contas adicionadas) */}
      {accounts.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-start sm:gap-4">
          <label className="flex shrink-0 items-center justify-end gap-1 pt-1 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[140px] sm:text-right">
            <span>Verificar duplicado</span>
            <InfoBalloon content="Regra de validação de duplicidade (aplica-se a todas as contas neste perfil)." />
          </label>

          <div className="flex-1 space-y-2">
            <p className="text-xs text-slate-500 dark:text-[#9DA2B4] select-none">
              &quot;Regra de validação de duplicidade (aplica-se a todas as
              contas neste perfil) &quot;
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-1">
              <label className="group flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={duplicateRules.usernamePassword}
                  onChange={() => handleToggleRule('usernamePassword')}
                  className="h-4 w-4 cursor-pointer rounded border border-slate-300 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] accent-[#7C3AED]"
                />
                <span className="text-xs text-slate-700 dark:text-[#C4C7D5] underline decoration-slate-300 dark:decoration-[#4B5063] decoration-dotted underline-offset-4 group-hover:text-slate-900 dark:group-hover:text-white">
                  Nome de utilizador e senha
                </span>
              </label>

              <label className="group flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={duplicateRules.cookie}
                  onChange={() => handleToggleRule('cookie')}
                  className="h-4 w-4 cursor-pointer rounded border border-slate-300 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] accent-[#7C3AED]"
                />
                <span className="text-xs text-slate-700 dark:text-[#C4C7D5] underline decoration-slate-300 dark:decoration-[#4B5063] decoration-dotted underline-offset-4 group-hover:text-slate-900 dark:group-hover:text-white">
                  Cookie
                </span>
              </label>

              <label className="group flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={duplicateRules.cUser}
                  onChange={() => handleToggleRule('cUser')}
                  className="h-4 w-4 cursor-pointer rounded border border-slate-300 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] accent-[#7C3AED]"
                />
                <span className="text-xs text-slate-700 dark:text-[#C4C7D5] underline decoration-slate-300 dark:decoration-[#4B5063] decoration-dotted underline-offset-4 group-hover:text-slate-900 dark:group-hover:text-white">
                  c_user
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 4. Seção: Abas */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-start sm:gap-4">
        <label className="flex shrink-0 items-center justify-end gap-1 pt-2 text-left text-xs font-medium text-slate-600 dark:text-[#9DA2B4] select-none sm:w-[140px] sm:text-right">
          <span>Abas</span>
          <InfoBalloon content="URLs que abrirão automaticamente ao inicializar este perfil." />
        </label>

        <div className="max-w-lg flex-1">
          <textarea
            rows={4}
            value={formData.openTabsUrls || ''}
            onChange={(e) => onChange('openTabsUrls', e.target.value)}
            placeholder={`Digite URLs (uma URL por linha)\nwww.google.com\nwww.facebook.com`}
            className="w-full rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-3 font-mono text-xs leading-relaxed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A6A9B6] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none shadow-xs"
          />
        </div>
      </div>
    </div>
  );
};

export default PlataformaTab;
