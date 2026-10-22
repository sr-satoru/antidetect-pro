import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { TooltipFloatingPortal } from './tooltip';

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

export const PLATFORM_COLOR_PALETTE = [
  'bg-violet-600 text-white',
  'bg-indigo-600 text-white',
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-cyan-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
  'bg-purple-600 text-white',
];

export function getPlatformColorClass(key?: string): string {
  if (!key || key === 'other') return 'bg-[#7C3AED] text-white';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLATFORM_COLOR_PALETTE[Math.abs(hash) % PLATFORM_COLOR_PALETTE.length];
}

/**
 * Renderiza o ícone de marca redondo (16x16, 18x18 ou 22x22)
 */
export const PlatformBrandIcon: React.FC<{
  platform: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ platform, size = 'sm', className = '' }) => {
  const key = resolvePlatformKey(platform);
  const cfg = PLATFORM_CONFIGS[key];

  const sizeClasses =
    size === 'xs'
      ? 'w-4 h-4 text-[8px]'
      : size === 'sm'
      ? 'w-[18px] h-[18px] text-[9.5px]'
      : size === 'md'
      ? 'w-[22px] h-[22px] text-[10.5px]'
      : 'w-[26px] h-[26px] text-[12px]';

  const iconSizeClass =
    size === 'xs'
      ? 'w-2.5 h-2.5'
      : size === 'sm'
      ? 'w-3 h-3'
      : size === 'md'
      ? 'w-3.5 h-3.5'
      : 'w-4 h-4';

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

  // Fallback genérico para domínios customizados / outras plataformas
  const initial = (platform || '?').charAt(0).toUpperCase();
  const colorClass = getPlatformColorClass(platform);
  return (
    <span
      title={platform || 'Plataforma'}
      className={`shrink-0 inline-flex items-center justify-center rounded-full font-bold select-none shadow-xs ${sizeClasses} ${colorClass} ${className}`}
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

  // 1. Tentar direto em `profile.platformAccounts` ou `profile.platform_accounts`
  let direct = profile.platformAccounts || profile.platform_accounts;
  if (typeof direct === 'string') {
    try {
      direct = JSON.parse(direct);
    } catch {
      direct = null;
    }
  }
  if (Array.isArray(direct) && direct.length > 0) {
    const list = direct.filter((a: any) => a && (a.platform || a.username || a.customDomain || a.password));
    if (list.length > 0) return list;
  }

  // 2. Tentar inspecionar dentro de `profile.fingerprint_json`
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
    let fromFp = fp.platform_accounts || fp.platformAccounts;
    if (typeof fromFp === 'string') {
      try {
        fromFp = JSON.parse(fromFp);
      } catch {
        fromFp = null;
      }
    }
    if (Array.isArray(fromFp) && fromFp.length > 0) {
      const list = fromFp.filter((a: any) => a && (a.platform || a.username || a.customDomain || a.password));
      if (list.length > 0) return list;
    }

    // Fallback para platform_url configurado no fingerprint
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
            username: fp.username || profile.username || '',
            password: fp.password || profile.password || '',
            twoFactorKey: fp.twoFactorKey || profile.twofa || profile.twoFactorKey || '',
          },
        ];
      } catch {
        return [
          {
            platform: fp.platform_url,
            customDomain: fp.platform_url,
            username: fp.username || profile.username || '',
            password: fp.password || profile.password || '',
            twoFactorKey: fp.twoFactorKey || profile.twofa || profile.twoFactorKey || '',
          },
        ];
      }
    }
  }

  // 3. Fallback legado em `profile.platform`
  if (profile.platform) {
    if (typeof profile.platform === 'object') {
      return [
        {
          platform: profile.platform.name || profile.platform.platform || 'other',
          username: profile.platform.handle || profile.platform.username || profile.username || '',
          password: profile.platform.password || profile.password || '',
          customDomain: profile.platform.domain || '',
          twoFactorKey: profile.platform.twofa || profile.platform.twoFactorKey || profile.twofa || profile.twoFactorKey || '',
        },
      ];
    }
    if (typeof profile.platform === 'string') {
      return [
        {
          platform: profile.platform,
          customDomain: profile.platform,
          username: profile.username || '',
          password: profile.password || '',
          twoFactorKey: profile.twofa || profile.twoFactorKey || '',
        },
      ];
    }
  }

  // 4. Fallback legado em `profile.platformUrl`
  if (profile.platformUrl && typeof profile.platformUrl === 'string') {
    return [
      {
        platform: profile.platformUrl,
        customDomain: profile.platformUrl,
        username: profile.username || '',
        password: profile.password || '',
        twoFactorKey: profile.twofa || profile.twoFactorKey || '',
      },
    ];
  }

  // 5. Fallback isolado caso tenha username ou password
  if (profile.username || profile.password) {
    return [
      {
        platform: 'other',
        username: profile.username || '',
        password: profile.password || '',
        twoFactorKey: profile.twofa || profile.twoFactorKey || '',
      },
    ];
  }

  return [];
}

/**
 * Componente da Célula de Plataforma da Tabela.
 * Exibe o ícone de marca + nome na linha, e um tooltip flutuante ultra-minimalista,
 * limpo e sem poluição visual (com fundo cinza claro e indicador em seta estilo AdsPower/AliasMode).
 */
export const PlatformCell: React.FC<PlatformCellProps> = ({ profile, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; arrowLeft: number } | null>(null);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const accounts = useMemo(() => extractProfilePlatforms(profile), [profile]);

  // Limpeza de timers no unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Atualiza coordenadas exatas para criar o portal flutuante sem ser cortado pelo overflow da tabela
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 180;
    const padding = 10;

    // Alinhamento horizontal baseado no centro do gatilho
    const triggerCenterX = rect.left + Math.min(rect.width, 130) / 2;

    let left = triggerCenterX - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) left = padding;

    // Posição da seta indicadora relativa à borda esquerda do balão
    const arrowLeft = Math.max(14, Math.min(popoverWidth - 14, triggerCenterX - left));

    // Exibe acima com seta para baixo se houver espaço na tela
    const showAbove = rect.top > 80;
    const top = showAbove ? rect.top - 7 : rect.bottom + 7;

    setPosition(showAbove ? 'top' : 'bottom');
    setCoords({ top, left, arrowLeft });
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
    }, 120);
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
  }, [isOpen, accounts]);

  const handleCopy = (text?: string, e?: React.MouseEvent, id?: string) => {
    if (!text) return;
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    if (id) {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      setCopiedId(id);
      copiedTimeoutRef.current = setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    }
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

  // 2. Conta principal exibida na célula da tabela
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
              className="text-xs font-semibold text-slate-900 dark:text-white truncate"
            >
              {primary.username || platformName}
            </span>

            {/* Contador sutil se houver mais de uma conta vinculada */}
            {totalCount > 1 && (
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#252733] text-slate-600 dark:text-[#9DA2B4] text-[10px] font-semibold border border-slate-200/80 dark:border-[#2D3039]">
                +{totalCount - 1}
              </span>
            )}
          </div>

          {/* Subtítulo: Senha oculta ou domínio */}
          <span className="text-[11px] text-slate-400 dark:text-[#9DA2B4] truncate">
            {primary.password ? '••••••••' : primary.customDomain || platformName}
          </span>
        </div>
      </div>

      {/* 3. Tooltip Popover Flutuante Minimalista terceirizado no TooltipFloatingPortal */}
      <TooltipFloatingPortal
        isOpen={isOpen}
        coords={coords ? { ...coords, isAbove: position === 'top' } : null}
        popoverRef={popoverRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        transform={position === 'top' ? 'translateY(-100%)' : 'translateY(0)'}
        className="w-max min-w-[150px] max-w-[260px] px-3 py-2"
      >
        {/* Lista minimalista vertical: uma conta debaixo da outra */}
        <div className="flex flex-col gap-2.5">
              {accounts.map((acc, idx) => {
                const username = acc.username?.trim() || '';
                const password = acc.password?.trim() || '';
                const subtext = password || acc.twoFactorKey || acc.customDomain;
                const accountCopyId = `acc-${acc.id || idx}`;
                const combinedCredentials =
                  username && password
                    ? `${username}:${password}`
                    : username || password || acc.customDomain || acc.platform;

                return (
                  <div
                    key={acc.id || idx}
                    className="flex flex-col leading-tight min-w-0"
                  >
                    {/* Linha 1: Ícone + Usuário + Botão ÚNICO de Copiar (User + Senha) */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {acc.platform ? (
                          <PlatformBrandIcon platform={acc.platform} size="xs" />
                        ) : null}
                        <span
                          onClick={(e) =>
                            handleCopy(username || acc.platform, e, `user-${acc.id || idx}`)
                          }
                          className="text-xs font-semibold text-white dark:text-slate-900 tracking-tight truncate cursor-pointer hover:opacity-80 transition-opacity"
                          title={
                            username
                              ? `Usuário: ${username} (clique para copiar apenas o usuário)`
                              : undefined
                          }
                        >
                          {username || acc.platform || 'Conta'}
                        </span>
                      </div>

                      {/* Botão ÚNICO da plataforma: Copia Usuário e Senha juntos */}
                      <button
                        type="button"
                        onClick={(e) =>
                          handleCopy(combinedCredentials, e, accountCopyId)
                        }
                        className="shrink-0 p-1 rounded text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-900 hover:bg-white/10 dark:hover:bg-black/10 transition-colors cursor-pointer"
                        title={
                          username && password
                            ? `Copiar usuário e senha (${combinedCredentials})`
                            : `Copiar credencial (${combinedCredentials})`
                        }
                        aria-label="Copiar usuário e senha"
                      >
                        {copiedId === accountCopyId ? (
                          <Check
                            size={12}
                            className="text-emerald-400 dark:text-emerald-600 stroke-[2.5]"
                          />
                        ) : (
                          <Copy size={12} className="stroke-[1.8]" />
                        )}
                      </button>
                    </div>

                    {/* Linha 2: Senha / Código alinhado abaixo do texto */}
                    {subtext && (
                      <div
                        className={`min-w-0 ${
                          acc.platform ? 'pl-[22px]' : ''
                        }`}
                      >
                        <span
                          onClick={(e) =>
                            (password || acc.twoFactorKey) &&
                            handleCopy(subtext, e, `sub-${acc.id || idx}`)
                          }
                          className={`text-[11px] font-mono text-slate-300 dark:text-slate-600 truncate block ${
                            password || acc.twoFactorKey
                              ? 'cursor-pointer hover:opacity-80 transition-opacity'
                              : ''
                          }`}
                          title={
                            password
                              ? `Senha: ${password} (clique para copiar apenas a senha)`
                              : acc.twoFactorKey
                              ? `2FA: ${acc.twoFactorKey} (clique para copiar apenas o 2FA)`
                              : subtext
                          }
                        >
                          {subtext}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
      </TooltipFloatingPortal>
    </>
  );
};

export default PlatformCell;

