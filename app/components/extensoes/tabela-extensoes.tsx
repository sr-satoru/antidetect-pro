import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowUpCircle,
  LayoutGrid,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Puzzle,
  Flame,
  Fingerprint,
  Key,
  QrCode,
  Bot,
  Ban,
  Cookie,
  Languages,
  Lock,
  ShoppingBag,
  Volume2,
  Wallet,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '@/services/api';

export const CATALOG_CATEGORIES = [
  'All',
  'Workflow and planning',
  'Shopping',
  'Tools',
  'Developer tools',
  'Privacy and security',
  'Education',
  'Accessibility',
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export interface RecommendedExtension {
  id: string;
  name: string;
  category: string;
  description: string;
  provider: 'Firefox Add-ons' | 'Chrome Web Store' | string;
  providerUrl?: string;
  iconType: string;
  iconBg: string;
  iconUrl?: string;
  featured?: boolean;
  bannerType?: 'social-echo' | 'prime-spy';
}

export interface ExtensionItem {
  id: number;
  name: string;
  iconType?: string;
  iconUrl?: string;
  iconBg?: string;
  enabled: boolean;
  status: 'available' | 'disabled';
  description: string;
  provider: string;
  providerUrl?: string;
  tab: 'team' | 'recommended';
}

interface TabelaExtensoesProps {
  extensions: ExtensionItem[];
  onAddClick: () => void;
  onToggleEnabled: (id: number) => void;
  onDelete: (id: number) => void;
  onAddRecommended?: (ext: RecommendedExtension) => void;
}

const renderExtensionIcon = (ext: ExtensionItem) => {
  if (ext.iconUrl) {
    return (
      <img
        src={ext.iconUrl}
        alt={ext.name}
        className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-xs"
      />
    );
  }

  const initial = ext.name ? ext.name.trim().charAt(0).toUpperCase() : '';
  const isFirefox =
    ext.iconType === 'firefox' || ext.provider?.includes('Firefox');

  return (
    <div
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-xs ${
        isFirefox
          ? 'bg-gradient-to-tr from-[#FF3B30] via-[#FF9500] to-[#E66000]'
          : ''
      }`}
      style={{
        backgroundColor: !isFirefox ? ext.iconBg || '#2A2C38' : undefined,
      }}
    >
      {initial ? (
        <span className="text-base font-bold text-white">{initial}</span>
      ) : isFirefox ? (
        <Flame size={22} className="text-white" />
      ) : (
        <Puzzle size={22} className="text-[#DFE104]" />
      )}
      {isFirefox && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#14151B] p-0.5 shadow-xs">
          <Flame size={10} className="text-[#FF9500]" />
        </span>
      )}
    </div>
  );
};

const renderRecommendedIcon = (ext: RecommendedExtension) => {
  if (ext.iconUrl) {
    return (
      <img
        src={ext.iconUrl}
        alt={ext.name}
        className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-xs"
      />
    );
  }

  switch (ext.iconType) {
    case 'fingerprint':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1677FF] to-[#0958D9] text-white shadow-xs">
          <Fingerprint size={22} className="text-white" />
        </div>
      );
    case 'keypad':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1890FF] to-[#0050B3] text-white shadow-xs">
          <Key size={19} className="text-yellow-300" />
        </div>
      );
    case 'authenticator':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#333644] bg-[#1C1E26] text-white shadow-xs">
          <QrCode size={19} className="text-white" />
        </div>
      );
    case 'octopus':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#096DD9] text-white shadow-xs">
          <Bot size={22} className="text-white" />
        </div>
      );
    case 'adblock':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E02424] text-white shadow-xs">
          <Ban size={21} className="text-white" />
        </div>
      );
    case 'exvul':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#374151] bg-[#111827] font-bold text-white shadow-xs">
          <span className="text-[11px] font-black tracking-wider text-[#38BDF8]">
            EV
          </span>
        </div>
      );
    case 'cookie':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6A3816] text-[#FBBF24] shadow-xs">
          <Cookie size={21} />
        </div>
      );
    case 'translate':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4285F4] text-white shadow-xs">
          <Languages size={21} />
        </div>
      );
    case 'captcha':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0891B2] text-white shadow-xs">
          <Lock size={19} />
        </div>
      );
    case 'zhixia':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-xs">
          <ShoppingBag size={20} />
        </div>
      );
    case 'firefox':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF3B30] via-[#FF9500] to-[#E66000] text-white shadow-xs">
          <Flame size={20} />
        </div>
      );
    case 'metamask':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F58220] text-white shadow-xs">
          <Wallet size={20} />
        </div>
      );
    case 'volume':
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-xs">
          <Volume2 size={20} />
        </div>
      );
    default:
      return (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-xs"
          style={{ backgroundColor: ext.iconBg || '#2A2C38' }}
        >
          {ext.name.charAt(0).toUpperCase()}
        </div>
      );
  }
};

export const TabelaExtensoes: React.FC<TabelaExtensoesProps> = ({
  extensions,
  onAddClick,
  onToggleEnabled,
  onDelete,
  onAddRecommended,
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'recommended'>(
    'recommended',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Estados específicos para a aba "Recomendado para você"
  const [selectedCategory, setSelectedCategory] =
    useState<CatalogCategory>('All');
  const [storeFilter, setStoreFilter] = useState<'all' | 'firefox' | 'chrome'>(
    'all',
  );
  const [recommendedList, setRecommendedList] = useState<
    RecommendedExtension[]
  >([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Efeito de busca do catálogo chamando o backend Python
  useEffect(() => {
    if (activeTab !== 'recommended') return;

    let isMounted = true;
    setIsLoadingSearch(true);

    const timer = setTimeout(async () => {
      try {
        const results = await api.extensions.getCatalog({
          q: searchQuery,
          category: selectedCategory,
          store: storeFilter,
        });
        if (isMounted) {
          setRecommendedList(results as RecommendedExtension[]);
        }
      } catch (err) {
        console.error('Erro ao buscar catálogo de extensões:', err);
      } finally {
        if (isMounted) {
          setIsLoadingSearch(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, storeFilter, activeTab]);

  // Filtro para extensões da equipe instaladas
  const teamExtensions = extensions.filter((ext) => {
    const q = searchQuery.toLowerCase();
    return (
      ext.tab === 'team' &&
      (!q ||
        ext.name.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#14151B] text-[#D2D5DF]">
      {/* 1. Abas Superiores */}
      <div className="flex h-12 shrink-0 items-center border-b border-[#2C2E3B] px-6 select-none">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`relative cursor-pointer pb-3 text-sm font-semibold transition-colors ${
              activeTab === 'team'
                ? 'text-white'
                : 'text-[#8E92A2] hover:text-white'
            }`}
          >
            <span>Extensões da equipe</span>
            {activeTab === 'team' && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-white" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recommended')}
            className={`relative cursor-pointer pb-3 text-sm font-semibold transition-colors ${
              activeTab === 'recommended'
                ? 'text-white'
                : 'text-[#8E92A2] hover:text-white'
            }`}
          >
            <span>Recomendado para você</span>
            {activeTab === 'recommended' && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-white" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Conteúdo Condicional Conforme a Aba Ativa */}
      {activeTab === 'team' ? (
        /* ================= ABA EXTENSÕES DA EQUIPE ================= */
        <>
          {/* Barra de Ações da Equipe */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4 select-none">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onAddClick}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#1677FF] px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(22,119,255,0.25)] transition-all hover:bg-[#3B8BFF] active:scale-[0.98]"
              >
                <ArrowUpCircle size={16} />
                <span>Adicionar extensão</span>
              </button>

              <div className="relative w-64 sm:w-80">
                <Search
                  size={14}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
                />
                <input
                  type="text"
                  placeholder="Procurar"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#686C7E] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="button"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#2D303E] bg-[#1A1C24] px-3.5 py-2 text-xs font-medium text-[#C8CBD4] transition-colors hover:border-[#3E4256] hover:text-white"
            >
              <LayoutGrid size={15} />
              <span>Categoria</span>
            </button>
          </div>

          {/* Grid de Cards da Equipe */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {teamExtensions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {teamExtensions.map((ext) => (
                  <div
                    key={ext.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-[#2D303E] bg-[#1B1D25] p-5 shadow-xs transition-all hover:border-[#3F4358] hover:bg-[#20222B]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {renderExtensionIcon(ext)}
                          <div className="min-w-0">
                            <h3
                              className="line-clamp-2 text-[13.5px] font-bold text-white"
                              title={ext.name}
                            >
                              {ext.name}
                            </h3>
                          </div>
                        </div>

                        {/* Switch & Status */}
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleEnabled(ext.id)}
                            className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-hidden ${
                              ext.enabled ? 'bg-[#1677FF]' : 'bg-[#3A3D4D]'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ${
                                ext.enabled
                                  ? 'translate-x-4.5'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-[#52C41A]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#52C41A]" />
                            <span>Available</span>
                          </span>
                        </div>
                      </div>

                      <p className="mt-3.5 mb-4 line-clamp-3 text-xs leading-relaxed text-[#8E92A2]">
                        {ext.description}
                      </p>
                    </div>

                    {/* Provedor e Opções */}
                    <div className="flex items-center justify-between border-t border-[#272935] pt-3 text-xs">
                      <div className="flex items-center gap-1.5 text-[11.5px] text-[#7C8092]">
                        <span>Provedor :</span>
                        <a
                          href={
                            ext.providerUrl && ext.providerUrl !== '#'
                              ? ext.providerUrl
                              : ext.provider?.includes('Firefox')
                                ? 'https://addons.mozilla.org/pt-BR/firefox/'
                                : 'https://chromewebstore.google.com'
                          }
                          target="_blank"
                          rel="noreferrer"
                          className={`font-medium hover:underline ${
                            ext.provider?.includes('Firefox')
                              ? 'text-[#FF7139]'
                              : 'text-[#1677FF]'
                          }`}
                        >
                          {ext.provider}
                        </a>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(openMenuId === ext.id ? null : ext.id)
                          }
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#7C8092] transition-colors hover:bg-[#2A2C38] hover:text-white"
                          title="Mais opções"
                        >
                          <MoreHorizontal size={15} />
                        </button>

                        {openMenuId === ext.id && (
                          <div className="absolute right-0 bottom-8 z-20 w-44 rounded-xl border border-[#333646] bg-[#1E202A] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                            <a
                              href={
                                ext.providerUrl && ext.providerUrl !== '#'
                                  ? ext.providerUrl
                                  : ext.provider?.includes('Firefox')
                                    ? 'https://addons.mozilla.org/pt-BR/firefox/'
                                    : 'https://chromewebstore.google.com'
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#C8CBD4] transition-colors hover:bg-[#2B2D3B] hover:text-white"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <ExternalLink size={13} />
                              <span>
                                {ext.provider?.includes('Firefox')
                                  ? 'Ver no Firefox AMO'
                                  : 'Ver na Web Store'}
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(ext.id);
                                setOpenMenuId(null);
                              }}
                              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#FF6B6B] transition-colors hover:bg-[#34181E]"
                            >
                              <Trash2 size={13} />
                              <span>Remover extensão</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-[#8E92A2]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2D303E] bg-[#1A1C24] text-[#717586]">
                  <Puzzle size={22} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Nenhuma extensão instalada na equipe
                  </p>
                  <p className="text-xs text-[#6C7082]">
                    Explore a aba &ldquo;Recomendado para você&rdquo; ou clique em
                    &ldquo;Adicionar extensão&rdquo;.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ================= ABA RECOMENDADO PARA VOCÊ (ADSPOWER STYLE) ================= */
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topo: Busca e Links Externos das Lojas */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3">
            <div className="relative w-64 sm:w-80">
              <Search
                size={14}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
              />
              <input
                type="text"
                placeholder="Procurar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#686C7E] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
              {isLoadingSearch && (
                <Loader2
                  size={13}
                  className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-[#1677FF]"
                />
              )}
            </div>

            <div className="text-[12px] text-[#8E92A2]">
              Não encontrou as extensões que deseja?{' '}
              <a
                href="https://addons.mozilla.org/pt-BR/firefox/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#FF7139] underline underline-offset-2 hover:text-[#FFA07A]"
              >
                Procure no Firefox AMO
              </a>{' '}
              ou{' '}
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#2F80ED] underline underline-offset-2 hover:text-[#5BA0FF]"
              >
                Chrome Web Store
              </a>
              .
            </div>
          </div>

          {/* Filtros de Categorias (Pills estilo AdsPower) */}
          <div className="flex shrink-0 items-center justify-between gap-3 overflow-x-auto px-6 py-2 no-scrollbar select-none">
            <div className="flex items-center gap-1.5">
              {CATALOG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#3A3D4D] text-white shadow-xs'
                      : 'text-[#8E92A2] hover:bg-[#1E202B] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Filtro rápido por loja */}
            <div className="hidden shrink-0 items-center gap-1 rounded-lg border border-[#2A2C38] bg-[#161720] p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setStoreFilter('all')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                  storeFilter === 'all'
                    ? 'bg-[#2B2D3B] text-white'
                    : 'text-[#7C8092] hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setStoreFilter('firefox')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                  storeFilter === 'firefox'
                    ? 'bg-[#FF7139]/20 text-[#FFA07A]'
                    : 'text-[#7C8092] hover:text-white'
                }`}
              >
                Firefox AMO
              </button>
              <button
                type="button"
                onClick={() => setStoreFilter('chrome')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                  storeFilter === 'chrome'
                    ? 'bg-[#2F80ED]/20 text-[#70A9FF]'
                    : 'text-[#7C8092] hover:text-white'
                }`}
              >
                Chrome Store
              </button>
            </div>
          </div>

          {/* Grid de Cards Recomendados */}
          <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6">
            {recommendedList.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recommendedList.map((recExt) => {
                  // Card de Banner Promocional (SocialEcho)
                  if (recExt.bannerType === 'social-echo') {
                    return (
                      <div
                        key={recExt.id}
                        className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#293249] bg-gradient-to-br from-[#121B2B] via-[#0E1522] to-[#0A0E18] p-5 shadow-xs transition-all hover:border-[#384E75]"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-wider text-[#38BDF8] uppercase">
                              SocialEcho
                            </span>
                            <span className="rounded-full bg-[#38BDF8]/15 px-2 py-0.5 text-[10px] font-semibold text-[#38BDF8]">
                              Featured
                            </span>
                          </div>
                          <h4 className="mt-1 text-sm font-bold text-white">
                            Social Media Management
                          </h4>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-[#94A3B8]">
                            AI Creation • Cross Posting • Shoppable Videos •
                            Auto-response
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 opacity-90">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-bold text-white">
                              f
                            </span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-[9px] font-bold text-white">
                              ig
                            </span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black text-[9px] font-bold text-white">
                              tk
                            </span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF0000] text-[9px] font-bold text-white">
                              yt
                            </span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0077B5] text-[9px] font-bold text-white">
                              in
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 pt-2">
                          <a
                            href="https://chromewebstore.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#2575FC]"
                          >
                            <span>+ Free Trial</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // Card de Banner Promocional (PrimeSPY)
                  if (recExt.bannerType === 'prime-spy') {
                    return (
                      <div
                        key={recExt.id}
                        className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#3E241E] bg-gradient-to-br from-[#261511] via-[#1C100E] to-[#120A09] p-5 shadow-xs transition-all hover:border-[#63352A]"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-wider text-[#FB923C] uppercase">
                              PrimeSPY
                            </span>
                            <span className="rounded-full bg-[#FB923C]/15 px-2 py-0.5 text-[10px] font-semibold text-[#FB923C]">
                              Ad Intelligence
                            </span>
                          </div>
                          <h4 className="mt-1 text-sm font-bold text-white">
                            Multi-Platform Ad Spy & Tracking
                          </h4>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-[#94A3B8]">
                            Massive Ad Library • Real-time Ad Tracking • Deep Ad
                            Analytics
                          </p>
                        </div>
                        <div className="mt-4 pt-2">
                          <a
                            href="https://chromewebstore.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#EA580C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#F97316]"
                          >
                            <span>Get for Free</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // Card de Extensão Padrão (AdsPower Style)
                  const isAlreadyAdded = extensions.some(
                    (item) =>
                      item.tab === 'team' &&
                      item.name.toLowerCase().trim() ===
                        recExt.name.toLowerCase().trim(),
                  );

                  return (
                    <div
                      key={recExt.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-[#2D303E] bg-[#1B1D25] p-5 shadow-xs transition-all hover:border-[#3F4358] hover:bg-[#20222B]"
                    >
                      <div>
                        {/* Linha Superior: Ícone, Título e Botão Adicionar/Adicionado */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {renderRecommendedIcon(recExt)}
                            <div className="min-w-0">
                              <h3
                                className="line-clamp-2 text-[13.5px] font-bold text-white"
                                title={recExt.name}
                              >
                                {recExt.name}
                              </h3>
                            </div>
                          </div>

                          {/* Botão de Ação AdsPower */}
                          <div className="shrink-0">
                            {isAlreadyAdded ? (
                              <span className="inline-flex select-none items-center rounded-md border border-[#2D303E] bg-[#161720] px-3 py-1.5 text-[11px] font-medium text-[#65697B]">
                                Adicionado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onAddRecommended && onAddRecommended(recExt)
                                }
                                className="cursor-pointer rounded-md border border-[#3E4256] bg-[#161720] px-3.5 py-1.5 text-[11.5px] font-semibold text-white transition-all hover:border-[#1677FF] hover:bg-[#1677FF] active:scale-95"
                              >
                                Adicionar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Descrição */}
                        <p className="mt-3.5 mb-4 line-clamp-3 text-xs leading-relaxed text-[#8E92A2]">
                          {recExt.description}
                        </p>
                      </div>

                      {/* Rodapé: Provedor */}
                      <div className="flex items-center justify-between border-t border-[#272935] pt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-[11.5px] text-[#7C8092]">
                          <span>Provedor :</span>
                          <a
                            href={recExt.providerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`font-medium hover:underline ${
                              recExt.provider === 'Firefox Add-ons'
                                ? 'text-[#FF7139]'
                                : 'text-[#1677FF]'
                            }`}
                          >
                            {recExt.provider}
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-[#8E92A2]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2D303E] bg-[#1A1C24] text-[#717586]">
                  <Sparkles size={22} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Nenhuma extensão encontrada
                  </p>
                  <p className="text-xs text-[#6C7082]">
                    Tente buscar por outro termo ou selecione a categoria
                    &ldquo;All&rdquo;.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabelaExtensoes;
