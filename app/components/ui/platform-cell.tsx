import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, ExternalLink, ShieldCheck, KeyRound } from 'lucide-react';

export interface PlatformAccount {
  id?: string;
  platform: string;
  customDomain?: string;
  username?: string;
  password?: string;
  twoFactorKey?: string;
}

export interface PlatformCellProps {
  profile: any;
  className?: string;
}

// Map of canonical brand marks and gradient/solid backgrounds (AliasMode / AdsPower style)
export const PLATFORM_CONFIGS: Record<
  string,
  {
    name: string;
    domain: string;
    bgClass: string;
    textClass: string;
    markSvg?: string;
    letterFallback: string;
  }
> = {
  x: {
    name: 'X (Twitter)',
    domain: 'x.com',
    bgClass: 'bg-[#0B0B0B] border border-white/10 text-white',
    textClass: 'text-white',
    markSvg:
      'M18.9 1.153h3.682l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932ZM17.61 20.644h2.04L6.486 3.24H4.298Z',
    letterFallback: '𝕏',
  },
  twitter: {
    name: 'X (Twitter)',
    domain: 'x.com',
    bgClass: 'bg-[#0B0B0B] border border-white/10 text-white',
    textClass: 'text-white',
    markSvg:
      'M18.9 1.153h3.682l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932ZM17.61 20.644h2.04L6.486 3.24H4.298Z',
    letterFallback: '𝕏',
  },
  instagram: {
    name: 'Instagram',
    domain: 'instagram.com',
    bgClass: 'bg-gradient-to-tr from-[#F9CE34] via-[#EE2A7B] to-[#6228D7] text-white',
    textClass: 'text-white',
    markSvg:
      'M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91a5.9 5.9 0 0 0 1.38 2.13 5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0Z',
    letterFallback: 'IG',
  },
  facebook: {
    name: 'Facebook',
    domain: 'facebook.com',
    bgClass: 'bg-[#0866FF] text-white',
    textClass: 'text-white',
    markSvg:
      'M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z',
    letterFallback: 'f',
  },
  meta: {
    name: 'Meta / Facebook',
    domain: 'facebook.com',
    bgClass: 'bg-[#0866FF] text-white',
    textClass: 'text-white',
    markSvg:
      'M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z',
    letterFallback: 'f',
  },
  tiktok: {
    name: 'TikTok',
    domain: 'tiktok.com',
    bgClass: 'bg-[#0B0B0B] border border-white/10 text-white',
    textClass: 'text-white',
    markSvg:
      'M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z',
    letterFallback: '♪',
  },
  google: {
    name: 'Google',
    domain: 'accounts.google.com',
    bgClass: 'bg-[#EA4335] text-white',
    textClass: 'text-white',
    markSvg:
      'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
    letterFallback: 'G',
  },
  gmail: {
    name: 'Gmail',
    domain: 'gmail.com',
    bgClass: 'bg-[#EA4335] text-white',
    textClass: 'text-white',
    markSvg:
      'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
    letterFallback: 'M',
  },
  amazon: {
    name: 'Amazon',
    domain: 'amazon.com',
    bgClass: 'bg-[#232F3E] text-white',
    textClass: 'text-white',
    markSvg:
      'M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13zm6.565-6.218c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zm3.753-.438c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02zm9.162 7.027c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z',
    letterFallback: 'a',
  },
  linkedin: {
    name: 'LinkedIn',
    domain: 'linkedin.com',
    bgClass: 'bg-[#0A66C2] text-white',
    textClass: 'text-white',
    markSvg:
      'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z',
    letterFallback: 'in',
  },
  paypal: {
    name: 'PayPal',
    domain: 'paypal.com',
    bgClass: 'bg-[#00457C] text-white',
    textClass: 'text-white',
    letterFallback: 'P',
  },
  outlook: {
    name: 'Outlook',
    domain: 'outlook.com',
    bgClass: 'bg-[#0078D4] text-white',
    textClass: 'text-white',
    letterFallback: 'O',
  },
  vinted: {
    name: 'Vinted',
    domain: 'vinted.fr',
    bgClass: 'bg-[#09B1BA] text-white',
    textClass: 'text-white',
    letterFallback: 'V',
  },
  ebay: {
    name: 'eBay',
    domain: 'ebay.com',
    bgClass: 'bg-[#E53238] text-white',
    textClass: 'text-white',
    letterFallback: 'e',
  },
  discord: {
    name: 'Discord',
    domain: 'discord.com',
    bgClass: 'bg-[#5865F2] text-white',
    textClass: 'text-white',
    letterFallback: 'D',
  },
  telegram: {
    name: 'Telegram',
    domain: 'telegram.org',
    bgClass: 'bg-gradient-to-b from-[#37BBFE] to-[#007DBB] text-white',
    textClass: 'text-white',
    letterFallback: 'T',
  },
};

/**
 * Normaliza e resolve o identificador de plataforma de forma segura
 */
export function resolvePlatformKey(raw?: string): string {
  if (!raw) return 'other';
  const clean = raw.toLowerCase().trim();
  if (PLATFORM_CONFIGS[clean]) return clean;

  if (clean.includes('twitter') || clean === 'x' || clean.includes('x.com')) return 'x';
  if (clean.includes('insta')) return 'instagram';
  if (clean.includes('facebook') || clean.includes('meta')) return 'facebook';
  if (clean.includes('tiktok')) return 'tiktok';
  if (clean.includes('google') || clean.includes('gmail')) return 'google';
  if (clean.includes('amazon')) return 'amazon';
  if (clean.includes('linkedin')) return 'linkedin';
  if (clean.includes('paypal')) return 'paypal';
  if (clean.includes('outlook') || clean.includes('hotmail')) return 'outlook';
  if (clean.includes('vinted')) return 'vinted';
  if (clean.includes('ebay')) return 'ebay';
  if (clean.includes('discord')) return 'discord';
  if (clean.includes('telegram')) return 'telegram';

  return clean;
}

/**
 * Renderiza o ícone de marca redondo (18x18 ou 20x20)
 */
export const PlatformBrandIcon: React.FC<{
  platform: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ platform, size = 'sm', className = '' }) => {
  const key = resolvePlatformKey(platform);
  const cfg = PLATFORM_CONFIGS[key];

  const sizeClasses =
    size === 'sm'
      ? 'w-[18px] h-[18px] text-[9.5px]'
      : size === 'md'
      ? 'w-[22px] h-[22px] text-[10.5px]'
      : 'w-[26px] h-[26px] text-[12px]';

  const iconSizeClass =
    size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (cfg) {
    return (
      <span
        title={cfg.name}
        className={`shrink-0 inline-flex items-center justify-center rounded-full font-bold shadow-xs select-none ${sizeClasses} ${cfg.bgClass} ${className}`}
      >
        {cfg.markSvg ? (
          <svg
            className={`${iconSizeClass} fill-current`}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d={cfg.markSvg} />
          </svg>
        ) : (
          <span>{cfg.letterFallback}</span>
        )}
      </span>
    );
  }

  // Fallback genérico para domínios customizados
  const initial = (platform || '?').charAt(0).toUpperCase();
  return (
    <span
      title={platform || 'Plataforma'}
      className={`shrink-0 inline-flex items-center justify-center rounded-full bg-slate-200 dark:bg-[#2C2E38] text-slate-700 dark:text-[#E1E4EE] font-bold border border-slate-300 dark:border-white/10 select-none shadow-xs ${sizeClasses} ${className}`}
    >
      {initial}
    </span>
  );
};

/**
 * Extrai todas as contas de plataformas vinculadas a um perfil de forma resiliente
 */
export function extractProfilePlatforms(profile: any): PlatformAccount[] {
  if (!profile) return [];

  // 1. Tentar direto em `profile.platformAccounts`
  if (Array.isArray(profile.platformAccounts) && profile.platformAccounts.length > 0) {
    return profile.platformAccounts.filter((a: any) => a && (a.platform || a.username || a.customDomain));
  }

  // 2. Tentar em `profile.platform_accounts`
  if (Array.isArray(profile.platform_accounts) && profile.platform_accounts.length > 0) {
    return profile.platform_accounts.filter((a: any) => a && (a.platform || a.username || a.customDomain));
  }

  // 3. Tentar inspecionar dentro de `profile.fingerprint_json`
  let fp: any = null;
  if (typeof profile.fingerprint_json === 'string') {
    try {
      fp = JSON.parse(profile.fingerprint_json);
    } catch {
      fp = null;
    }
  } else if (typeof profile.fingerprint_json === 'object' && profile.fingerprint_json !== null) {
    fp = profile.fingerprint_json;
  }

  if (fp) {
    const fromFp = fp.platform_accounts || fp.platformAccounts;
    if (Array.isArray(fromFp) && fromFp.length > 0) {
      return fromFp.filter((a: any) => a && (a.platform || a.username || a.customDomain));
    }

    // Fallback para platform_url configurado
    if (fp.platform_url && typeof fp.platform_url === 'string') {
      try {
        const u = new URL(
          fp.platform_url.startsWith('http') ? fp.platform_url : `https://${fp.platform_url}`,
        );
        const host = u.hostname.replace(/^www\./, '');
        return [
          {
            platform: host,
            customDomain: host,
            username: '',
          },
        ];
      } catch {
        return [
          {
            platform: fp.platform_url,
            customDomain: fp.platform_url,
            username: '',
          },
        ];
      }
    }
  }

  // 4. Fallback legado em `profile.platform`
  if (profile.platform) {
    if (typeof profile.platform === 'object') {
      return [
        {
          platform: profile.platform.name || 'other',
          username: profile.platform.handle || profile.platform.username || '',
          customDomain: profile.platform.domain || '',
        },
      ];
    }
    if (typeof profile.platform === 'string') {
      return [
        {
          platform: profile.platform,
          customDomain: profile.platform,
          username: '',
        },
      ];
    }
  }

  // 5. Fallback em `profile.platformUrl`
  if (profile.platformUrl && typeof profile.platformUrl === 'string') {
    return [
      {
        platform: profile.platformUrl,
        customDomain: profile.platformUrl,
        username: '',
      },
    ];
  }

  return [];
}

/**
 * Componente principal desacoplado da Célula de Plataforma da Tabela.
 * Apresenta a visualização condensada na linha e o Tooltip Popover Flutuante
 * rico (igual ao AdsPower / AliasMode) com portaling para nunca ser cortado pela tabela.
 */
export const PlatformCell: React.FC<PlatformCellProps> = ({ profile, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const accounts = useMemo(() => extractProfilePlatforms(profile), [profile]);

  // Atualiza coordenadas exatas para criar o portal flutuante sem ser cortado pelo overflow da tabela
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 280;
    const padding = 12;

    // Calcular x evitando overflow na borda direita da tela
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) left = padding;

    // Se estiver muito embaixo da tela, exibe acima da célula; caso contrário, abaixo
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldShowAbove = spaceBelow < 220;
    const top = shouldShowAbove ? rect.top - 8 : rect.bottom + 6;

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Re-calcular posição em scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  // 1. Estado Vazio: perfil sem contas de plataforma
  if (!accounts || accounts.length === 0) {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <span
          title="Nenhuma plataforma vinculada"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/80 dark:bg-[#252733] text-slate-400 dark:text-[#767A8A] text-[10px] tracking-widest font-bold"
        >
          •••
        </span>
      </div>
    );
  }

  // 2. Conta principal exibida na célula
  const primary = accounts[0];
  const totalCount = accounts.length;
  const platformName = PLATFORM_CONFIGS[resolvePlatformKey(primary.platform)]?.name || primary.platform;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group inline-flex items-center gap-2 max-w-full cursor-pointer py-1 select-none ${className}`}
      >
        <PlatformBrandIcon platform={primary.platform} size="sm" />

        <div className="flex flex-col min-w-0 max-w-[130px] leading-tight">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span
              title={primary.username || platformName}
              className="text-[12px] font-medium text-slate-900 dark:text-[#E6E8EE] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
            >
              {primary.username || platformName}
            </span>

            {/* Badge de contador se houver múltiplas contas vinculadas */}
            {totalCount > 1 && (
              <span className="shrink-0 px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 text-[9.5px] font-semibold border border-blue-200 dark:border-blue-900/60">
                +{totalCount - 1}
              </span>
            )}
          </div>

          {/* Subtítulo: Senha ou domínio sutil */}
          <span className="text-[10px] text-slate-400 dark:text-[#8D90A0] truncate">
            {primary.password ? '••••••••' : primary.customDomain || platformName}
          </span>
        </div>
      </div>

      {/* 3. Popover Flutuante Portaled (estilo AdsPower / AliasMode) */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-[290px] rounded-xl border border-slate-200 dark:border-[#2D303C] bg-white/95 dark:bg-[#1A1C24]/95 backdrop-blur-md shadow-2xl p-3 text-slate-800 dark:text-[#D5D8E2] text-left animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-[#282A35]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#7A7F90]">
                Plataformas Vinculadas ({accounts.length})
              </span>
              <span className="text-[10px] text-slate-400 dark:text-[#686C7D]">
                {profile.name || 'Perfil'}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-0.5 scrollbar-thin">
              {accounts.map((acc, idx) => {
                const pKey = resolvePlatformKey(acc.platform);
                const info = PLATFORM_CONFIGS[pKey];
                const accId = acc.id || `acc-${idx}`;

                return (
                  <div
                    key={accId}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-slate-50 dark:bg-[#20222D] border border-slate-100 dark:border-[#2C2E3B] transition-colors"
                  >
                    {/* Linha 1: Ícone + Usuário + Ação de Copiar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlatformBrandIcon platform={acc.platform} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span
                            title={acc.username || info?.name || acc.platform}
                            className="text-[12px] font-semibold text-slate-900 dark:text-white truncate"
                          >
                            {acc.username || (
                              <span className="text-slate-400 dark:text-slate-500 italic font-normal">
                                Sem usuário
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-[#8D90A0]">
                            {info?.name || acc.platform}
                          </span>
                        </div>
                      </div>

                      {acc.username && (
                        <button
                          type="button"
                          onClick={(e) => handleCopy(acc.username!, `user-${accId}`, e)}
                          title="Copiar usuário"
                          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#2E3140] transition-colors cursor-pointer"
                        >
                          {copiedId === `user-${accId}` ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Linha 2: Senha / Domínio / 2FA se existirem */}
                    {(acc.password || acc.customDomain || acc.twoFactorKey) && (
                      <div className="mt-1 pt-1 border-t border-slate-200/60 dark:border-white/5 flex flex-col gap-0.5 text-[10.5px]">
                        {acc.password && (
                          <div className="flex items-center justify-between text-slate-500 dark:text-[#9A9EB0] font-mono">
                            <span className="flex items-center gap-1">
                              <KeyRound size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[170px]">{acc.password}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(acc.password!, `pass-${accId}`, e)}
                              title="Copiar senha"
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === `pass-${accId}` ? (
                                <Check size={10} className="text-emerald-500" />
                              ) : (
                                <Copy size={10} />
                              )}
                            </button>
                          </div>
                        )}

                        {acc.twoFactorKey && (
                          <div className="flex items-center justify-between text-slate-500 dark:text-[#9A9EB0] font-mono">
                            <span className="flex items-center gap-1 text-[10px]">
                              <ShieldCheck size={10} className="text-amber-500 shrink-0" />
                              <span className="truncate max-w-[170px]">2FA: {acc.twoFactorKey}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(acc.twoFactorKey!, `2fa-${accId}`, e)}
                              title="Copiar chave 2FA"
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === `2fa-${accId}` ? (
                                <Check size={10} className="text-emerald-500" />
                              ) : (
                                <Copy size={10} />
                              )}
                            </button>
                          </div>
                        )}

                        {acc.customDomain && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#7A7F90] truncate">
                            <ExternalLink size={9} className="shrink-0" />
                            <span className="truncate">{acc.customDomain}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default PlatformCell;
