export interface RecommendedExtension {
  id: string;
  name: string;
  category:
    | 'Workflow and planning'
    | 'Shopping'
    | 'Tools'
    | 'Developer tools'
    | 'Privacy and security'
    | 'Education'
    | 'Accessibility';
  description: string;
  provider: 'Firefox Add-ons' | 'Chrome Web Store';
  providerUrl: string;
  iconType: string;
  iconBg: string;
  iconUrl?: string;
  featured?: boolean;
  bannerType?: 'social-echo' | 'prime-spy';
}

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

export const RECOMMENDED_EXTENSIONS_CATALOG: RecommendedExtension[] = [
  {
    id: 'adspower-assistant',
    name: 'AdsPower Assistant',
    category: 'Workflow and planning',
    description:
      'AdsPower Assistant is a browser extension for managing multiple accounts and automating tasks, ensuring efficiency and security.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/adspower-assistant',
    iconType: 'fingerprint',
    iconBg: '#1677FF',
  },
  {
    id: 'adspower-authenticator',
    name: 'AdsPower Authenticator',
    category: 'Privacy and security',
    description:
      '2FA codes generator and auto-login manager. Together with the AdsPower browser, this tool makes the Internet a safer place.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/adspower-authenticator',
    iconType: 'keypad',
    iconBg: '#1890FF',
  },
  {
    id: 'authenticator',
    name: 'Authenticator',
    category: 'Privacy and security',
    description:
      'Authenticator generates two-factor authentication (2FA) codes in your browser with end-to-end encryption.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/authenticator/bhghoamapcdpbohkgigfljmggbfbikom',
    iconType: 'authenticator',
    iconBg: '#22242D',
  },
  {
    id: 'octopusrpa',
    name: 'OctopusRPA',
    category: 'Workflow and planning',
    description:
      'Add-on for web automation and robotic process automation, provided by OctopusRPA for web data collection.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/octopusrpa',
    iconType: 'octopus',
    iconBg: '#096DD9',
  },
  {
    id: 'ublock-origin',
    name: 'uBlock Origin',
    category: 'Privacy and security',
    description:
      'Bloqueador de anúncios e rastreadores ultra eficiente, com mínimo consumo de CPU e RAM. Integrado nativamente ao Camoufox.',
    provider: 'Firefox Add-ons',
    providerUrl: 'https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/',
    iconType: 'firefox',
    iconBg: '#FF7139',
  },
  {
    id: 'banner-social-echo',
    name: 'SocialEcho Management',
    category: 'Workflow and planning',
    description: 'AI Creation • Cross Posting • Shoppable Videos • Auto-response • Post tracking para redes sociais.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'banner',
    iconBg: '#0052CC',
    bannerType: 'social-echo',
  },
  {
    id: 'adblock',
    name: 'AdBlock — best ad blocker',
    category: 'Privacy and security',
    description:
      'Block ads and pop-ups on YouTube, Facebook, Twitch, and your favorite websites seamlessly.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/adblock-%E2%80%94-best-ad-blocker/gighmmpiobklfepjocnamgkkbiglidom',
    iconType: 'adblock',
    iconBg: '#E02424',
  },
  {
    id: 'exvul-defender',
    name: 'ExVul Web3 Scam Defender',
    category: 'Privacy and security',
    description:
      'Identify and alert web3 phishing, fraud and other security risks in social media etc, detect malicious transactions with wallets.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/exvul-web3-scam-defender',
    iconType: 'exvul',
    iconBg: '#111827',
  },
  {
    id: 'cookie-editor',
    name: 'Cookie-Editor',
    category: 'Developer tools',
    description:
      'Simple yet powerful Cookie Editor that allows you to quickly create, edit, export and delete cookies without leaving your tab.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm',
    iconType: 'cookie',
    iconBg: '#6A3816',
  },
  {
    id: 'google-translate',
    name: 'Google Translate',
    category: 'Tools',
    description:
      'View translations easily as you browse the web. By the Google Translate team with 100+ languages support.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/google-translate/aapbdbdomjkkjkaonfhkkikfgjllcleb',
    iconType: 'translate',
    iconBg: '#4285F4',
  },
  {
    id: 'banner-primespy',
    name: 'PrimeSPY Ad Spy & Tracking',
    category: 'Shopping',
    description: 'Massive Ad Library • Real-time Ad Tracking • Deep Ad Analytics para campanhas de e-commerce e afiliados.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com',
    iconType: 'banner',
    iconBg: '#FF5722',
    bannerType: 'prime-spy',
  },
  {
    id: 'captcha-solver',
    name: 'Captcha Solver: Auto Recognition',
    category: 'Tools',
    description:
      '2Captcha Solver plugin allows you to automatically solve CAPTCHAs, reCAPTCHA, and hCaptcha found on any webpage.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/2captcha-solver',
    iconType: 'captcha',
    iconBg: '#0891B2',
  },
  {
    id: 'zhixia-data',
    name: 'Zhixia Data',
    category: 'Shopping',
    description:
      'Zhixia Data is a professional tool for Shopee market analysis and product selection, powered by AI analytics.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/zhixia-data',
    iconType: 'zhixia',
    iconBg: '#EA580C',
  },
  {
    id: 'dark-reader',
    name: 'Dark Reader',
    category: 'Accessibility',
    description:
      'Tema escuro para todos os sites. Inverte o brilho excessivo tornando a navegação noturna agradável e sem cansaço visual.',
    provider: 'Firefox Add-ons',
    providerUrl: 'https://addons.mozilla.org/pt-BR/firefox/addon/darkreader/',
    iconType: 'firefox',
    iconBg: '#1F2937',
  },
  {
    id: 'tampermonkey',
    name: 'Tampermonkey',
    category: 'Developer tools',
    description:
      'O gerenciador de scripts de usuários mais popular do mundo. Execute scripts customizados para automatizar tarefas em qualquer página.',
    provider: 'Firefox Add-ons',
    providerUrl: 'https://addons.mozilla.org/pt-BR/firefox/addon/tampermonkey/',
    iconType: 'firefox',
    iconBg: '#111827',
  },
  {
    id: 'foxyproxy',
    name: 'FoxyProxy Standard',
    category: 'Tools',
    description:
      'Gerenciador avançado de proxies para o Firefox/Camoufox. Alterna automaticamente proxies com base em regras de URL e padrões globais.',
    provider: 'Firefox Add-ons',
    providerUrl: 'https://addons.mozilla.org/pt-BR/firefox/addon/foxyproxy-standard/',
    iconType: 'firefox',
    iconBg: '#EA580C',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    category: 'Privacy and security',
    description:
      'Uma carteira de criptomoedas segura e gateway confiável para aplicativos blockchain da Web3.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
    iconType: 'metamask',
    iconBg: '#F58220',
  },
  {
    id: 'volume-master',
    name: 'Volume Master',
    category: 'Accessibility',
    description:
      'Controle até 600% de volume por aba individualmente com amplificação de áudio digital de alta qualidade.',
    provider: 'Chrome Web Store',
    providerUrl: 'https://chromewebstore.google.com/detail/volume-master/jghecgabfgfdldnmbpehkepalcocgdhe',
    iconType: 'volume',
    iconBg: '#2563EB',
  },
  {
    id: 'user-agent-switcher',
    name: 'User-Agent Switcher and Manager',
    category: 'Developer tools',
    description:
      'Alterne facilmente a string de User-Agent do seu navegador para simular dispositivos e sistemas operacionais variados.',
    provider: 'Firefox Add-ons',
    providerUrl: 'https://addons.mozilla.org/pt-BR/firefox/addon/user-agent-string-switcher/',
    iconType: 'firefox',
    iconBg: '#4F46E5',
  },
];

/**
 * Busca extensões no catálogo local e, se houver query, consulta a API pública do Firefox AMO
 */
export async function searchExtensionsCatalog(
  query: string,
  category: CatalogCategory = 'All',
  storeFilter: 'all' | 'firefox' | 'chrome' = 'all'
): Promise<RecommendedExtension[]> {
  const cleanQ = query.trim().toLowerCase();

  // 1. Filtra catálogo pré-instalado
  let localResults = RECOMMENDED_EXTENSIONS_CATALOG.filter((ext) => {
    const matchesCategory = category === 'All' || ext.category === category;
    const matchesStore =
      storeFilter === 'all' ||
      (storeFilter === 'firefox' && ext.provider === 'Firefox Add-ons') ||
      (storeFilter === 'chrome' && ext.provider === 'Chrome Web Store');

    const matchesQuery =
      !cleanQ ||
      ext.name.toLowerCase().includes(cleanQ) ||
      ext.description.toLowerCase().includes(cleanQ) ||
      ext.category.toLowerCase().includes(cleanQ);

    return matchesCategory && matchesStore && matchesQuery;
  });

  // Se não houver busca de texto ou for específico de categoria, retorna o catálogo local rápido
  if (!cleanQ || cleanQ.length < 2) {
    return localResults;
  }

  // 2. Busca dinâmica na API do Firefox Add-ons (AMO) para enriquecer resultados ao vivo
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const amoUrl = `https://addons.mozilla.org/api/v5/addons/search/?q=${encodeURIComponent(
      cleanQ
    )}&type=extension&page_size=8`;

    const res = await fetch(amoUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const onlineResults: RecommendedExtension[] = (data.results || [])
        .filter(
          (addon: any) =>
            !localResults.some(
              (local) => local.name.toLowerCase() === (addon.name?.['pt-BR'] || addon.name?.['en-US'] || addon.name || '').toLowerCase()
            )
        )
        .map((addon: any) => {
          const rawName =
            typeof addon.name === 'string'
              ? addon.name
              : addon.name?.['pt-BR'] ||
                addon.name?.['en-US'] ||
                Object.values(addon.name || {})[0] ||
                'Extensão AMO';

          const rawSummary =
            typeof addon.summary === 'string'
              ? addon.summary
              : addon.summary?.['pt-BR'] ||
                addon.summary?.['en-US'] ||
                Object.values(addon.summary || {})[0] ||
                'Extensão oficial do ecossistema Firefox Add-ons.';

          return {
            id: `amo-${addon.id}`,
            name: rawName,
            category: 'Tools' as const,
            description: rawSummary,
            provider: 'Firefox Add-ons' as const,
            providerUrl:
              addon.url ||
              `https://addons.mozilla.org/pt-BR/firefox/addon/${addon.slug}/`,
            iconType: 'firefox',
            iconBg: '#FF7139',
            iconUrl: addon.icon_url,
          };
        });

      return [...localResults, ...onlineResults];
    }
  } catch {
    // Falha silenciosa de rede/CORS: retorna os resultados locais com segurança
  }

  return localResults;
}
