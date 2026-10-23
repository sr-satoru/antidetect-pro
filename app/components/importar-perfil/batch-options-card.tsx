import React, { useEffect, useState } from 'react';
import { Folder, Globe, Settings2, Shield, Network, Sparkles, Share2 } from 'lucide-react';
import { AstroBrowserIcon, AstroFoxIcon } from '../icons';
import { serviceGrupos } from '@/services/grupos/service.grupos';

interface BatchOptionsCardProps {
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  selectedKernel: string;
  onKernelChange: (kernel: string) => void;
  selectedPlatform: string;
  onPlatformChange: (platform: string) => void;
  overrideGroup: boolean;
  onOverrideGroupChange: (val: boolean) => void;
  proxyStrategy: string;
  onProxyStrategyChange: (strategy: string) => void;
  customProxyType?: string;
  onCustomProxyTypeChange?: (val: string) => void;
  customProxyHost?: string;
  onCustomProxyHostChange?: (val: string) => void;
  customProxyPort?: string;
  onCustomProxyPortChange?: (val: string) => void;
  customProxyUser?: string;
  onCustomProxyUserChange?: (val: string) => void;
  customProxyPass?: string;
  onCustomProxyPassChange?: (val: string) => void;
}

const PLATFORMS = [
  { value: '', label: 'Auto-detectar pelo arquivo / abas (Recomendado)' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook / Meta' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'X (Twitter)', label: 'X (Twitter)' },
  { value: 'Google', label: 'Google / Gmail' },
  { value: 'Amazon', label: 'Amazon' },
  { value: 'Shopee', label: 'Shopee' },
  { value: 'Mercado Livre', label: 'Mercado Livre' },
  { value: 'Discord', label: 'Discord' },
];

export const BatchOptionsCard: React.FC<BatchOptionsCardProps> = ({
  selectedGroup,
  onGroupChange,
  selectedKernel,
  onKernelChange,
  selectedPlatform,
  onPlatformChange,
  overrideGroup,
  onOverrideGroupChange,
  proxyStrategy,
  onProxyStrategyChange,
  customProxyType = 'http',
  onCustomProxyTypeChange,
  customProxyHost = '',
  onCustomProxyHostChange,
  customProxyPort = '',
  onCustomProxyPortChange,
  customProxyUser = '',
  onCustomProxyUserChange,
  customProxyPass = '',
  onCustomProxyPassChange,
}) => {
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    serviceGrupos
      .list()
      .then((groups) => {
        if (Array.isArray(groups)) {
          setExistingGroups(groups.map((g: any) => g.name || g));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateGroup = () => {
    const clean = newGroupName.trim();
    if (!clean) return;
    if (!existingGroups.includes(clean)) {
      setExistingGroups((prev) => [...prev, clean]);
    }
    onGroupChange(clean);
    setIsCreatingGroup(false);
    setNewGroupName('');
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-5 shadow-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[#7C3AED] dark:text-[#A78BFA]" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Configurações e Compatibilidade do Lote
          </h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-[#9DA2B4]">
          Defina as regras padrão aplicadas aos perfis importados
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Motor do Navegador (Kernel) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#E2E4EC] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe size={13} className="text-slate-400 dark:text-[#9DA2B4]" />
              Motor do Navegador
            </span>
            {selectedKernel === 'auto' && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#7C3AED] dark:text-[#A78BFA] font-medium bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 px-1.5 py-0.5 rounded">
                <Sparkles size={10} />
                Inteligente
              </span>
            )}
          </label>

          <div className="grid grid-cols-3 gap-1.5 h-9">
            <button
              type="button"
              onClick={() => onKernelChange('auto')}
              className={`flex items-center justify-center gap-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedKernel === 'auto'
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] shadow-2xs font-bold'
                  : 'border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-600 dark:text-[#9DA2B4] hover:bg-slate-50 dark:hover:bg-[#282A33]'
              }`}
              title="Detecta se o perfil é Chrome (AstroBrowser) ou Firefox (AstroFox) a partir do User-Agent"
            >
              <Sparkles size={13} />
              <span>Auto</span>
            </button>

            <button
              type="button"
              onClick={() => onKernelChange('AstroBrowser')}
              className={`flex items-center justify-center gap-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedKernel === 'AstroBrowser'
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-slate-900 dark:text-white shadow-2xs'
                  : 'border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-600 dark:text-[#9DA2B4] hover:bg-slate-50 dark:hover:bg-[#282A33]'
              }`}
            >
              <AstroBrowserIcon size={14} />
              <span>Chromium</span>
            </button>

            <button
              type="button"
              onClick={() => onKernelChange('AstroFox')}
              className={`flex items-center justify-center gap-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedKernel === 'AstroFox'
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-slate-900 dark:text-white shadow-2xs'
                  : 'border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-600 dark:text-[#9DA2B4] hover:bg-slate-50 dark:hover:bg-[#282A33]'
              }`}
            >
              <AstroFoxIcon size={14} />
              <span>Firefox</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-[#6C7284]">
            {selectedKernel === 'auto'
              ? 'Identifica o motor individual de cada perfil pelo User-Agent do AdsPower.'
              : selectedKernel === 'AstroFox'
              ? 'Força motor Firefox (AstroFox) em todos os perfis.'
              : 'Força motor Chromium (AstroBrowser) em todos os perfis.'}
          </span>
        </div>

        {/* 2. Estratégia de Rede e Proxy */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#E2E4EC] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Network size={13} className="text-slate-400 dark:text-[#9DA2B4]" />
              Estratégia de Proxy
            </span>
            {proxyStrategy === 'none' && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Conexão Direta
              </span>
            )}
          </label>

          <select
            value={proxyStrategy}
            onChange={(e) => onProxyStrategyChange(e.target.value)}
            className="w-full h-9 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] text-slate-900 dark:text-white text-xs px-3 rounded-lg focus:outline-hidden cursor-pointer"
          >
            <option value="keep">Manter proxies originais do arquivo</option>
            <option value="none">Conexão Direta (Sem Proxy / Ignorar proxies)</option>
            <option value="override">Substituir por Proxy Personalizado no Lote</option>
          </select>

          <span className="text-[11px] text-slate-400 dark:text-[#6C7284]">
            {proxyStrategy === 'none'
              ? 'Ignora proxies residuais e garante navegação HTTPS direta sem bloqueio.'
              : proxyStrategy === 'override'
              ? 'Configura um proxy exclusivo para todo este lote de perfis.'
              : 'Usa os proxies especificados no arquivo do AdsPower.'}
          </span>
        </div>

        {/* 3. Grupo de Destino */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#E2E4EC] flex items-center gap-1.5">
            <Folder size={13} className="text-slate-400 dark:text-[#9DA2B4]" />
            <span>Grupo de Destino</span>
          </label>

          {isCreatingGroup ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup();
                  if (e.key === 'Escape') setIsCreatingGroup(false);
                }}
                placeholder="Nome do novo grupo..."
                className="flex-1 h-9 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] text-slate-900 dark:text-white text-xs px-3 rounded-lg focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCreateGroup}
                className="h-9 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold cursor-pointer"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="h-9 px-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedGroup}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsCreatingGroup(true);
                  } else {
                    onGroupChange(e.target.value);
                  }
                }}
                className="flex-1 h-9 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] text-slate-900 dark:text-white text-xs px-3 rounded-lg focus:outline-hidden cursor-pointer"
              >
                <option value="">Manter original do arquivo ou Desagrupado</option>
                {existingGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="__NEW__">+ Criar Novo Grupo...</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 mt-1 cursor-pointer text-[11px] text-slate-500 dark:text-[#9DA2B4]">
            <input
              type="checkbox"
              checked={overrideGroup}
              onChange={(e) => onOverrideGroupChange(e.target.checked)}
              className="rounded accent-[#7C3AED]"
            />
            <span>Forçar este grupo em todos os perfis importados</span>
          </label>
        </div>

        {/* 4. Plataforma de Destino */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#E2E4EC] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Share2 size={13} className="text-slate-400 dark:text-[#9DA2B4]" />
              <span>Plataforma</span>
            </span>
            {!selectedPlatform && (
              <span className="text-[10px] text-[#7C3AED] dark:text-[#A78BFA] font-medium">
                Auto
              </span>
            )}
          </label>

          <select
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="w-full h-9 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] text-slate-900 dark:text-white text-xs px-3 rounded-lg focus:outline-hidden cursor-pointer"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-slate-400 dark:text-[#6C7284]">
            {selectedPlatform
              ? `Aplica '${selectedPlatform}' a todos os perfis do lote.`
              : 'Detecta automaticamente Instagram, Facebook, TikTok, X, etc.'}
          </span>
        </div>
      </div>

      {/* Formulário expandido de Proxy quando "override" é selecionado */}
      {proxyStrategy === 'override' && (
        <div className="p-3.5 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 dark:bg-[#7C3AED]/10 flex flex-col gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7C3AED] dark:text-[#A78BFA]">
            <Shield size={14} />
            <span>Configuração do Proxy do Lote</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <div className="sm:col-span-1">
              <label className="text-[10px] text-slate-500 dark:text-[#9DA2B4] font-medium">Tipo</label>
              <select
                value={customProxyType}
                onChange={(e) => onCustomProxyTypeChange?.(e.target.value)}
                className="w-full h-8 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] text-xs px-2 rounded-md"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-500 dark:text-[#9DA2B4] font-medium">Host / IP</label>
              <input
                type="text"
                placeholder="ex: 198.51.100.1"
                value={customProxyHost}
                onChange={(e) => onCustomProxyHostChange?.(e.target.value)}
                className="w-full h-8 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] text-xs px-2.5 rounded-md"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-[10px] text-slate-500 dark:text-[#9DA2B4] font-medium">Porta</label>
              <input
                type="number"
                placeholder="8080"
                value={customProxyPort}
                onChange={(e) => onCustomProxyPortChange?.(e.target.value)}
                className="w-full h-8 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] text-xs px-2.5 rounded-md"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-[10px] text-slate-500 dark:text-[#9DA2B4] font-medium">Usuário (opcional)</label>
              <input
                type="text"
                placeholder="User"
                value={customProxyUser}
                onChange={(e) => onCustomProxyUserChange?.(e.target.value)}
                className="w-full h-8 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] text-xs px-2.5 rounded-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
