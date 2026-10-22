import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Puzzle,
  Loader2,
  Sparkles,
  Plus,
  Shield,
  Check,
  Users,
} from 'lucide-react';
import { api } from '@/services/index.api';
import { ModalGerenciarCategorias } from '@/components/ui/modal-gerenciar-categorias';

const LoadingSpinner: React.FC<{ message?: string; subMessage?: string }> = ({
  message = 'Carregando extensões...',
  subMessage,
}) => (
  <div className="flex h-72 flex-col items-center justify-center gap-3.5 text-center select-none animate-in fade-in duration-200">
    <div className="relative flex items-center justify-center">
      <Loader2 size={30} className="animate-spin text-[#388BFD]" />
    </div>
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm font-medium text-slate-900 dark:text-[#E6EDF3]">{message}</p>
      {subMessage && <p className="text-xs text-slate-500 dark:text-[#848D97]">{subMessage}</p>}
    </div>
  </div>
);

export const CATALOG_CATEGORIES = [
  'All',
  'Workflow and planning',
  'Tools',
  'Privacy and security',
  'Developer tools',
  'Shopping',
  'Education',
  'Social Networking',
  'Accessibility',
  'Just for Fun',
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
  initialTab?: 'team' | 'recommended';
  extensions: ExtensionItem[];
  isLoadingTeam?: boolean;
  onAddClick: () => void;
  onToggleEnabled: (id: number) => void;
  onDelete: (id: number) => void;
  onAddRecommended?: (ext: RecommendedExtension) => void;
}

/**
 * Catálogo com as extensões da referência oficial da imagem enviada pelo usuário
 */
export const CURATED_RECOMMENDED_EXTENSIONS: RecommendedExtension[] = [
  {
    id: 'bitwarden',
    name: 'Bitwarden Password Manager',
    category: 'Privacy and security',
    description: 'At home, at work, or on the go, Bitwarden easily secures all your passwords, passkeys, and sensitive information',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb',
    iconType: 'bitwarden',
    iconBg: '#175DDC',
    featured: true,
  },
  {
    id: 'share-a-cart',
    name: 'Share-A-Cart — Easily Share Shopping Carts',
    category: 'Shopping',
    description: 'Share-A-Cart allows you to share the contents of your cart with anyone else.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/share-a-cart/gighmmpiobklfepjocnamgkkbiglidom',
    iconType: 'sharea-cart',
    iconBg: '#FFFFFF',
    featured: true,
  },
  {
    id: 'vidiq',
    name: 'vidIQ Vision for YouTube',
    category: 'Workflow and planning',
    description: 'Uncover the secrets to success behind your favorite YouTube videos.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/vidiq-vision-for-youtube/pbehaadkifggfoaohenembapocdfnjik',
    iconType: 'vidiq',
    iconBg: '#FFFFFF',
    featured: true,
  },
  {
    id: 'deepl',
    name: 'DeepL: translate and write with AI',
    category: 'Education',
    description: "Translate while you read and write with DeepL Translate, the world's most accurate translator.",
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/deepl-translate-and-write/cofdbpoegempjloogbagkncekinflcnj',
    iconType: 'deepl',
    iconBg: '#0F2B46',
    featured: true,
  },
  {
    id: 'ad-library-cloud',
    name: 'Ad Library Cloud',
    category: 'Workflow and planning',
    description: 'Save ads from Facebook Ad Library in one click, download ads from the Ad Library in HD quality.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'adlibrary',
    iconBg: '#1877F2',
    featured: true,
  },
  {
    id: 'cookie-editor',
    name: 'Cookie Editor',
    category: 'Developer tools',
    description: 'A powerful and easy-to-use Cookie Editor.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm',
    iconType: 'cookie',
    iconBg: '#FFFBEB',
    featured: true,
  },
  {
    id: 'random-user-agent',
    name: 'Random User-Agent (Switcher)',
    category: 'Tools',
    description: 'Automatically change the user agent after specified period of time to a randomly selected one',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/random-user-agent-switche/einpaelgookohagofgnnkcfjbkkgepnp',
    iconType: 'useragent',
    iconBg: '#DC2626',
    featured: true,
  },
  {
    id: 'webrtc-leak-shield',
    name: 'WebRTC Leak Shield',
    category: 'Privacy and security',
    description: 'Disable WebRTC and prevent IP leak.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'webrtc-shield',
    iconBg: '#FFFFFF',
    featured: true,
  },
  {
    id: 'webrtc-control',
    name: 'WebRTC Control',
    category: 'Privacy and security',
    description: 'Have control over WebRTC (disable | enable) and protect your IP address.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'webrtc-control',
    iconBg: '#FFFFFF',
    featured: true,
  },
  {
    id: 'j2team-cookies',
    name: 'J2TEAM Cookies',
    category: 'Developer tools',
    description: 'Simple tool to export/import cookies. Share online accounts without revealing your password.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'j2team',
    iconBg: '#78350F',
    featured: true,
  },
  {
    id: 'portal-dex',
    name: 'Portal DEX',
    category: 'Tools',
    description: 'Portal DEX that facilitates custody-less cross-chain swaps',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'portal-dex',
    iconBg: '#121216',
    featured: true,
  },
  {
    id: 'ads-check-by-smit',
    name: 'Ads Check by SMIT',
    category: 'Workflow and planning',
    description: 'Sản phẩm của SMIT dành cho các nhà quảng cáo trên Facebook.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'ads-check',
    iconBg: '#059669',
    featured: true,
  },
  {
    id: 'adblock-best-ad-blocker',
    name: 'AdBlock — best ad blocker',
    category: 'Privacy and security',
    description: 'Block ads and pop-ups on YouTube, Facebook, Twitch, and your favorite websites.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/adblock-%E2%80%94-best-ad-block/gighmmpiobklfepjocnamgkkbiglidom',
    iconType: 'adblock',
    iconBg: '#DC2626',
  },
  {
    id: 'ads-trust',
    name: 'Ads Trust',
    category: 'Workflow and planning',
    description: 'Get to know the trust level of your Facebook Ads account.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'adstrust',
    iconBg: '#0284C7',
  },
  {
    id: 'primus',
    name: 'Primus',
    category: 'Workflow and planning',
    description: 'A zkTLS-powered tool for verifying website data and actions with privacy.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'primus',
    iconBg: '#EA580C',
  },
  {
    id: 'steam-inventory-helper',
    name: 'Steam Inventory Helper',
    category: 'Tools',
    description: 'Adds Steam inventory prices, item details, and trade status directly on Steam and Steam-market pages.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/steam-inventory-helper/cmeakgjggjdlcpncigglobpjbkabhmjl',
    iconType: 'sih',
    iconBg: '#0F172A',
  },
];

/**
 * Renderizador de Ícones Vetoriais das Extensões Idênticos à Imagem de Referência
 */
const renderExtensionBadge = (
  iconType?: string,
  iconUrl?: string,
  name?: string,
  sizeClass = 'h-10 w-10',
) => {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name || 'Extensão'}
        className={`${sizeClass} shrink-0 rounded-lg object-contain bg-slate-100 dark:bg-[#21262D] p-1 border border-slate-200 dark:border-[#30363D]`}
      />
    );
  }

  const normalized = (iconType || name || '').toLowerCase();

  // 1. Bitwarden Password Manager
  if (normalized.includes('bitwarden')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#175DDC] select-none`}
        title="Bitwarden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 4.1-2.67 7.92-6 8.89-3.33-.97-6-4.79-6-8.89V6.43l6-2.25z" />
          <path d="M11 9h2v6h-2z" fill="white" />
        </svg>
      </div>
    );
  }

  // 2. Share-A-Cart
  if (normalized.includes('share-a-cart') || normalized.includes('sharea-cart')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] select-none`}
        title="Share-A-Cart"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="20" r="1.5" fill="#F59E0B" />
          <circle cx="18" cy="20" r="1.5" fill="#EF4444" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="#2563EB" />
        </svg>
      </div>
    );
  }

  // 3. vidIQ
  if (normalized.includes('vidiq')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex flex-col items-center justify-center bg-slate-100 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] select-none p-1`}
        title="vidIQ"
      >
        <span className="text-[#0D1B2A] dark:text-[#E6EDF3] font-black text-[10px] tracking-tight leading-none">vidIQ</span>
        <div className="h-1 w-2.5 bg-[#FF0000] rounded-xs mt-0.5" />
      </div>
    );
  }

  // 4. DeepL
  if (normalized.includes('deepl')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#0F2B46] select-none`}
        title="DeepL"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-white stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
          <circle cx="7" cy="7" r="2" fill="white" />
          <circle cx="17" cy="12" r="2" fill="white" />
          <circle cx="7" cy="17" r="2" fill="white" />
          <path d="M7 9v6l10-3z" stroke="white" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // 5. Ad Library Cloud
  if (normalized.includes('ad library') || normalized === 'adlibrary') {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#1877F2] select-none`}
        title="Ad Library Cloud"
      >
        <span className="text-white font-extrabold text-[15px] tracking-tight">Ad</span>
      </div>
    );
  }

  // 6. Cookie Editor
  if (normalized.includes('cookie')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-[#25201A] border border-amber-200/60 dark:border-amber-900/30 select-none text-xl`}
        title="Cookie Editor"
      >
        🍪
      </div>
    );
  }

  // 7. Random User-Agent
  if (normalized.includes('user-agent') || normalized.includes('useragent')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#DC2626] select-none`}
        title="Random User-Agent"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      </div>
    );
  }

  // 8. WebRTC Leak Shield
  if (normalized.includes('webrtc leak') || normalized === 'webrtc-shield') {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] select-none`}
        title="WebRTC Leak Shield"
      >
        <Shield className="h-5 w-5 text-[#0284C7] fill-[#0284C7]/20" />
      </div>
    );
  }

  // 9. WebRTC Control
  if (normalized.includes('webrtc control')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] select-none`}
        title="WebRTC Control"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[#059669] stroke-2 fill-none">
          <circle cx="12" cy="12" r="9" stroke="#E11D48" />
          <path d="M12 7v10M7 12h10" stroke="#059669" />
        </svg>
      </div>
    );
  }

  // 10. J2TEAM Cookies
  if (normalized.includes('j2team')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#D97706] select-none text-white font-bold text-base`}
        title="J2TEAM Cookies"
      >
        🍪
      </div>
    );
  }

  // 11. Portal DEX
  if (normalized.includes('portal dex') || normalized.includes('portal-dex')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#21262D] border border-slate-200 dark:border-[#30363D] select-none`}
        title="Portal DEX"
      >
        <span className="text-[#A855F7] font-black text-xs">P</span>
      </div>
    );
  }

  // 12. Ads Check by SMIT
  if (normalized.includes('ads check') || normalized.includes('smit')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#059669] select-none text-white font-bold text-[9px]`}
        title="Ads Check by SMIT"
      >
        <div className="flex flex-col items-center leading-none">
          <span>ADS</span>
          <span className="text-[7.5px] opacity-80 mt-0.5">SMIT</span>
        </div>
      </div>
    );
  }

  // 13. AdBlock
  if (normalized.includes('adblock')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#DC2626] select-none`}
        title="AdBlock"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
          <path d="M12 2a1 1 0 0 1 .707.293l4 4A1 1 0 0 1 17 7v4a1 1 0 0 1-.293.707l-4 4A1 1 0 0 1 12 16h-4a1 1 0 0 1-.707-.293l-4-4A1 1 0 0 1 3 11V7a1 1 0 0 1 .293-.707l4-4A1 1 0 0 1 8 2h4z" />
          <path d="M10 5.5a.75.75 0 0 1 .75.75v3.25h1V6.25a.75.75 0 0 1 1.5 0v3.25h.5V7a.75.75 0 0 1 1.5 0v4.2a3.5 3.5 0 0 1-1.025 2.475L12.5 15.4a2.5 2.5 0 0 1-3.536 0L7.24 13.68A2.5 2.5 0 0 1 6.5 11.91V9a.75.75 0 0 1 1.5 0v1.5h1V6.25A.75.75 0 0 1 10 5.5z" />
        </svg>
      </div>
    );
  }

  // 14. Ads Trust
  if (normalized.includes('ads trust') || normalized === 'adstrust') {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#0284C7] select-none`}
        title="Ads Trust"
      >
        <span className="text-white font-extrabold text-[17px] leading-none">t?</span>
      </div>
    );
  }

  // 15. Primus
  if (normalized.includes('primus')) {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#FF5500] select-none`}
        title="Primus"
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-white stroke-[2.75] stroke-linecap-round stroke-linejoin-round">
          <path d="M4 6h16v12H7V9h10v6h-7" />
        </svg>
      </div>
    );
  }

  // 16. Steam Inventory Helper
  if (normalized.includes('steam') || normalized === 'sih') {
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-[#21262D] select-none border border-slate-200 dark:border-[#30363D]`}
        title="Steam Inventory Helper"
      >
        <span className="text-[#00E5FF] font-black text-[10px] tracking-tight">[SIH]</span>
      </div>
    );
  }

  // Fallback padrão limpo
  const initial = name ? name.trim().charAt(0).toUpperCase() : '';
  return (
    <div
      className={`${sizeClass} shrink-0 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-800 dark:text-[#E6EDF3] font-bold text-sm select-none`}
    >
      {initial || <Puzzle size={18} className="text-slate-400 dark:text-[#848D97]" />}
    </div>
  );
};

export const TabelaExtensoes: React.FC<TabelaExtensoesProps> = ({
  initialTab = 'team',
  extensions,
  isLoadingTeam = false,
  onAddClick,
  onToggleEnabled,
  onDelete,
  onAddRecommended,
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'recommended'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Estados específicos para a aba "Recomendado para você"
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory>('All');
  const [recommendedList, setRecommendedList] = useState<RecommendedExtension[]>(
    CURATED_RECOMMENDED_EXTENSIONS,
  );
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Efeito de busca com catálogo curado e fallback confiável
  useEffect(() => {
    if (activeTab !== 'recommended') return;

    let isMounted = true;
    setIsLoadingSearch(true);

    const timer = setTimeout(async () => {
      try {
        const results = await api.extensions.getCatalog({
          q: searchQuery,
          category: selectedCategory === 'All' ? undefined : selectedCategory,
        });

        if (isMounted && Array.isArray(results) && results.length > 0) {
          const backendList: RecommendedExtension[] = results.map((item: any) => ({
            id: String(item.id || item.slug || item.name),
            name: item.name,
            category: item.category || 'Tools',
            description: item.description || 'Extensão compatível com a plataforma.',
            provider: item.provider || 'Chrome Web Store',
            providerUrl: item.provider_url || item.providerUrl || 'https://chromewebstore.google.com',
            iconType: item.icon_type || item.iconType || 'custom',
            iconBg: item.icon_bg || item.iconBg || '#181920',
            iconUrl: item.icon_url || item.iconUrl,
          }));

          const merged: RecommendedExtension[] = [...backendList];
          for (const cur of CURATED_RECOMMENDED_EXTENSIONS) {
            if (!merged.some((m) => m.name.toLowerCase() === cur.name.toLowerCase())) {
              merged.push(cur);
            }
          }
          setRecommendedList(merged);
        } else if (isMounted) {
          const q = searchQuery.toLowerCase().trim();
          const filtered = CURATED_RECOMMENDED_EXTENSIONS.filter((ext) => {
            const matchesQuery =
              !q ||
              ext.name.toLowerCase().includes(q) ||
              ext.description.toLowerCase().includes(q);
            const matchesCat =
              selectedCategory === 'All' ||
              ext.category.toLowerCase() === selectedCategory.toLowerCase();
            return matchesQuery && matchesCat;
          });
          setRecommendedList(filtered);
        }
      } catch (err) {
        if (isMounted) {
          const q = searchQuery.toLowerCase().trim();
          const filtered = CURATED_RECOMMENDED_EXTENSIONS.filter((ext) => {
            const matchesQuery =
              !q ||
              ext.name.toLowerCase().includes(q) ||
              ext.description.toLowerCase().includes(q);
            const matchesCat =
              selectedCategory === 'All' ||
              ext.category.toLowerCase() === selectedCategory.toLowerCase();
            return matchesQuery && matchesCat;
          });
          setRecommendedList(filtered);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSearch(false);
        }
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, activeTab]);

  // Filtro para extensões da equipe
  const teamExtensions = extensions.filter((ext) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      ext.tab === 'team' &&
      (!q ||
        ext.name.toLowerCase().includes(q) ||
        ext.description?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#1E2026] text-slate-800 dark:text-[#FFFFFF]">
      {/* ═══════════════════════════════════════════════════════════════
          TOP BAR DE NAVEGAÇÃO PREMIUM CENTRALIZADA (Capsule Tabs - Estilo Configuration)
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex shrink-0 items-center border-b border-slate-200/80 dark:border-[#484A54] bg-white/90 dark:bg-[#28292E]/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-center">
          <div className="bg-slate-100/90 dark:bg-[#323338] p-1.5 rounded-xl border border-slate-200/60 dark:border-[#484A54] flex items-center gap-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`rounded-lg px-6 py-2.5 text-[13.5px] font-medium transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-white dark:bg-[#454750] text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/50 dark:border-white/10'
                  : 'text-slate-600 dark:text-[#A6A9B6] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Extensões da equipe</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('recommended')}
              className={`rounded-lg px-6 py-2.5 text-[13.5px] font-medium transition-all cursor-pointer ${
                activeTab === 'recommended'
                  ? 'bg-white dark:bg-[#454750] text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/50 dark:border-white/10'
                  : 'text-slate-600 dark:text-[#A6A9B6] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Recomendado para você</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Condicional Conforme a Aba Ativa */}
      {activeTab === 'team' ? (
        /* ================= ABA EXTENSÕES DA EQUIPE ================= */
        <>
          {/* Barra de Ações da Equipe */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3.5 select-none">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onAddClick}
                className="h-[38px] px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-[0_0_12px_rgba(124,58,237,0.35)] active:scale-[0.98]"
              >
                <Plus size={16} />
                <span>Adicionar extensão</span>
              </button>

              <div className="relative w-72 sm:w-80">
                <Search
                  size={15}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 dark:text-[#B0B3C2]"
                />
                <input
                  type="text"
                  placeholder="Procurar"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] pr-3.5 pl-10 text-[13px] text-slate-900 dark:text-[#FFFFFF] placeholder-slate-400 dark:placeholder-[#A4A7B6] transition-colors focus:border-slate-400 dark:focus:border-[#72768A] focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="h-[38px] px-4 rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] text-slate-700 dark:text-[#E4E6EE] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#3A3B42] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LayoutGrid size={15} />
              <span>Categoria</span>
            </button>
          </div>

          {/* Grid de Cards da Equipe: 3 ou 4 itens por linha */}
          <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
            {teamExtensions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {teamExtensions.map((ext) => (
                  <div
                    key={ext.id}
                    className="group relative flex min-h-[200px] flex-col justify-between rounded-xl border border-slate-200/80 dark:border-[#484A54] bg-white/80 dark:bg-[#323338] p-5 hover:border-slate-300 dark:hover:border-[#606373] dark:hover:bg-[#3A3B42] transition-all duration-150 backdrop-blur-xs shadow-xs"
                  >
                    <div>
                      {/* Topo: Ícone, Título e Switch de Ativação */}
                      <div className="flex items-start justify-between gap-3.5">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {renderExtensionBadge(
                            ext.iconType,
                            ext.iconUrl,
                            ext.name,
                            'h-12 w-12',
                          )}
                          <div className="min-w-0 pt-0.5">
                            <h3
                              className="line-clamp-2 text-[15px] font-semibold text-slate-900 dark:text-[#FFFFFF] leading-snug"
                              title={ext.name}
                            >
                              {ext.name}
                            </h3>
                          </div>
                        </div>

                        {/* Switch Ativar/Desativar Proporcional */}
                        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => onToggleEnabled(ext.id)}
                            className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-hidden ${ext.enabled
                                ? 'bg-[#7C3AED]'
                                : 'bg-slate-300 dark:bg-[#484A54]'
                              }`}
                          >
                            <span
                              className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition duration-200 shadow-xs ${ext.enabled ? 'translate-x-5.5' : 'translate-x-1'
                                }`}
                            />
                          </button>
                          <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500 dark:text-[#B0B3C2]">
                            <span
                              className={`h-2 w-2 rounded-full ${ext.enabled ? 'bg-[#7C3AED]' : 'bg-slate-400 dark:bg-[#B0B3C2]'
                                }`}
                            />
                            <span>{ext.enabled ? 'Ativo' : 'Pausado'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Descrição em escala proporcional */}
                      <p className="mt-3.5 mb-4 line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-[#C5C8D4] min-h-[56px]">
                        {ext.description || 'Extensão instalada e pronta para uso no perfil.'}
                      </p>
                    </div>

                    {/* Rodapé: Provedor e Opções sem divisória pesada */}
                    <div className="flex items-center justify-between text-xs pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#A4A7B6]">
                        <span>Provedor :</span>
                        <a
                          href={
                            ext.providerUrl && ext.providerUrl !== '#'
                              ? ext.providerUrl
                              : 'https://chromewebstore.google.com'
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#58A6FF] hover:underline font-medium"
                        >
                          {ext.provider || 'Chrome Web Store'}
                        </a>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(openMenuId === ext.id ? null : ext.id)
                          }
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-[#B0B3C2] transition-colors dark:hover:bg-[#40424B] dark:hover:text-white"
                          title="Mais opções"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openMenuId === ext.id && (
                          <div className="absolute right-0 bottom-8 z-20 w-44 rounded-xl border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                            <a
                              href={
                                ext.providerUrl && ext.providerUrl !== '#'
                                  ? ext.providerUrl
                                  : 'https://chromewebstore.google.com'
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-[#848D97] transition-colors hover:bg-slate-100 dark:hover:bg-[#21262D] hover:text-slate-900 dark:hover:text-[#E6EDF3]"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <ExternalLink size={13} />
                              <span>Ver na Web Store</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(ext.id);
                                setOpenMenuId(null);
                              }}
                              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
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
            ) : isLoadingTeam ? (
              <LoadingSpinner
                message="Carregando extensões da equipe..."
                subMessage="Sincronizando com o banco local"
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-[#848D97]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-[#30363D] bg-slate-100 dark:bg-[#161B22] text-slate-400 dark:text-[#848D97]">
                  <Puzzle size={22} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-[#E6EDF3]">
                    Nenhuma extensão instalada na equipe
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#848D97] mt-1">
                    Explore a aba &ldquo;Recomendado para você&rdquo; ou clique em
                    &ldquo;Adicionar extensão&rdquo;.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ================= ABA RECOMENDADO PARA VOCÊ (DESIGN FIEL À IMAGEM) ================= */
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topo: Campo de Pesquisa à Esquerda e Link da Chrome Web Store à Direita */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3">
            <div className="relative w-72 sm:w-80">
              <Search
                size={15}
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 dark:text-[#B0B3C2]"
              />
              <input
                type="text"
                placeholder="Procurar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] pr-9 pl-10 text-[13px] text-slate-900 dark:text-[#FFFFFF] placeholder-slate-400 dark:placeholder-[#A4A7B6] transition-colors focus:border-slate-400 dark:focus:border-[#72768A] focus:outline-hidden"
              />
              {isLoadingSearch && (
                <Loader2
                  size={14}
                  className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-[#388BFD]"
                />
              )}
            </div>

            <div className="text-[13px] text-slate-500 dark:text-[#B0B3C2]">
              Não encontrou as extensões que deseja?{' '}
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#58A6FF] hover:underline font-medium"
              >
                Procure na Chrome Web Store.
              </a>
            </div>
          </div>

          {/* Filtros de Categorias (Pills com proporção elegante) */}
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto px-6 py-2.5 no-scrollbar select-none">
            {CATALOG_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors cursor-pointer ${isSelected
                      ? 'border border-slate-300 dark:border-[#585B6A] bg-slate-200/70 dark:bg-[#3E4048] text-slate-900 dark:text-[#FFFFFF] shadow-2xs'
                      : 'text-slate-600 dark:text-[#B0B3C2] hover:text-slate-900 dark:hover:text-[#FFFFFF] border border-transparent'
                    }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grid de Cards Recomendados: 4 itens por linha, leves, arejados e sem peso visual */}
          <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6">
            {recommendedList.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recommendedList.map((recExt) => {
                  const isAlreadyAdded = extensions.some(
                    (item) =>
                      item.tab === 'team' &&
                      item.name.toLowerCase().trim() ===
                      recExt.name.toLowerCase().trim(),
                  );

                  return (
                    <div
                      key={recExt.id}
                      className="group relative flex min-h-[200px] flex-col justify-between rounded-xl border border-slate-200/80 dark:border-[#484A54] bg-white/80 dark:bg-[#323338] p-5 hover:border-slate-300 dark:hover:border-[#606373] dark:hover:bg-[#3A3B42] transition-all duration-150 backdrop-blur-xs shadow-xs"
                    >
                      <div>
                        {/* Linha Superior: Ícone, Título e Botão Adicionar sutil */}
                        <div className="flex items-start justify-between gap-3.5">
                          <div className="flex items-start gap-3.5 min-w-0">
                            {renderExtensionBadge(
                              recExt.iconType,
                              recExt.iconUrl,
                              recExt.name,
                              'h-12 w-12',
                            )}
                            <div className="min-w-0 pt-0.5">
                              <h3
                                className="line-clamp-2 text-[15px] font-semibold text-slate-900 dark:text-[#FFFFFF] leading-snug"
                                title={recExt.name}
                              >
                                {recExt.name}
                              </h3>
                            </div>
                          </div>

                          {/* Botão de Ação: Estilo sutil com borda fina idêntico à imagem */}
                          <div className="shrink-0 pt-0.5">
                            {isAlreadyAdded ? (
                              <span className="inline-flex select-none items-center rounded-lg border border-slate-200 dark:border-[#484A54] bg-slate-100 dark:bg-[#25262B] px-3.5 py-1.5 text-[12.5px] font-medium text-slate-400 dark:text-[#B0B3C2]">
                                <span>Adicionado</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onAddRecommended && onAddRecommended(recExt)
                                }
                                className="cursor-pointer rounded-lg border border-slate-300 dark:border-[#585B6A] bg-transparent hover:bg-slate-100 dark:hover:bg-[#40424B] hover:border-slate-400 dark:hover:border-[#72768A] px-4 py-1.5 text-[12.5px] font-medium text-slate-700 dark:text-[#E4E6EE] hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                Adicionar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Descrição em cinza suave e confortável de ler com 40% mais respiro */}
                        <p className="mt-3.5 mb-4 line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-[#C5C8D4] min-h-[56px]">
                          {recExt.description}
                        </p>
                      </div>

                      {/* Rodapé: Provedor com link azul sem divisória pesada */}
                      <div className="flex items-center text-xs pt-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#A4A7B6]">
                          <span>Provedor :</span>
                          <a
                            href={recExt.providerUrl || 'https://chromewebstore.google.com'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#58A6FF] hover:underline font-medium"
                          >
                            {recExt.provider}
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isLoadingSearch ? (
              <LoadingSpinner
                message="Carregando extensões..."
                subMessage="Buscando catálogo recomendado"
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-[#848D97]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-[#30363D] bg-slate-100 dark:bg-[#161B22] text-slate-400 dark:text-[#848D97]">
                  <Sparkles size={22} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-[#E6EDF3]">
                    Nenhuma extensão encontrada
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#848D97] mt-1">
                    Tente buscar por outro termo ou selecione a categoria
                    &ldquo;All&rdquo;.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ModalGerenciarCategorias
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
};

export default TabelaExtensoes;


