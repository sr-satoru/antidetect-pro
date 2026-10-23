import React from 'react';
import { Trash2, ShieldCheck, Cookie, Sparkles, ExternalLink } from 'lucide-react';
import { IpSuccessIcon } from '../icons';
import { AstroBrowserIcon, AstroFoxIcon } from '../icons';
import { OsIcon } from '../ui/os-icon';
import { PlatformBrandIcon } from '../ui/platform-cell';
import type { ImportPreviewItem } from '@/services/importar-perfil/service.types';

interface PreviewTableProps {
  profiles: ImportPreviewItem[];
  onRemoveItem: (index: number) => void;
  defaultGroup: string;
  overrideGroup: boolean;
  selectedKernel?: string;
  proxyStrategy?: string;
  customProxyType?: string;
  customProxyHost?: string;
  customProxyPort?: string;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({
  profiles,
  onRemoveItem,
  defaultGroup,
  overrideGroup,
  selectedKernel = 'auto',
  proxyStrategy = 'keep',
  customProxyType = 'http',
  customProxyHost = '',
  customProxyPort = '',
}) => {
  if (profiles.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-5 shadow-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#7C3AED] dark:text-[#A78BFA]" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Pré-Visualização dos Perfis Detectados ({profiles.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-[#9DA2B4]">
          Revise os dados antes de confirmar a importação
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-[#2D3039]">
        <table className="min-w-full w-full border-collapse text-left text-xs whitespace-nowrap">
          <thead className="border-b border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] text-xs font-semibold text-slate-600 dark:text-[#9DA2B4] uppercase">
            <tr className="h-10">
              <th className="w-[44px] px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">Nome do Perfil</th>
              <th className="px-3 py-2">Motor / Navegador</th>
              <th className="px-3 py-2">Conta / Plataforma</th>
              <th className="px-3 py-2">Grupo</th>
              <th className="px-3 py-2">Conexão / Proxy</th>
              <th className="px-3 py-2">Cookies</th>
              <th className="px-3 py-2">Resolução</th>
              <th className="w-[46px] px-3 py-2 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {profiles.map((p, idx) => {
              const displayGroup =
                overrideGroup && defaultGroup ? defaultGroup : p.group || defaultGroup || 'Desagrupado';

              const effectiveKernel =
                selectedKernel && selectedKernel !== 'auto'
                  ? selectedKernel
                  : p.kernel || 'AstroBrowser';

              const isChromium = effectiveKernel.toLowerCase().includes('browser') || effectiveKernel.toLowerCase().includes('chrome');
              const kernelDisplay = isChromium ? 'AstroBrowser' : 'AstroFox';

              const hasFileProxy = Boolean(p.proxy_host && p.proxy_host.trim());
              const fileProxyDesc = hasFileProxy
                ? `${p.proxy_host}${p.proxy_port ? `:${p.proxy_port}` : ''}`
                : '-';

              return (
                <tr
                  key={`${p.name}-${idx}`}
                  className="h-11 hover:bg-slate-50 dark:hover:bg-[#252733] transition-colors"
                >
                  <td className="px-3 py-2 text-center font-mono text-xs text-slate-400 dark:text-[#6C7284]">
                    {idx + 1}
                  </td>

                  {/* Nome e OS */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <OsIcon os={p.os || 'windows'} size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-white" title={p.name}>
                        {p.name}
                      </span>
                    </div>
                  </td>

                  {/* Motor / Kernel */}
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08]">
                      {isChromium ? <AstroBrowserIcon size={13} /> : <AstroFoxIcon size={13} />}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {kernelDisplay}
                      </span>
                      {p.browser_version && (
                        <span className="text-[10px] text-slate-400 dark:text-[#8E93A4] font-mono">
                          v{p.browser_version}
                        </span>
                      )}
                      {selectedKernel === 'auto' && (
                        <span
                          title="Detectado automaticamente pelo User-Agent do perfil"
                          className="text-[#7C3AED] dark:text-[#A78BFA] ml-0.5"
                        >
                          <Sparkles size={11} />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Conta / Plataforma / Abas */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {p.platform ? (
                        <div className="flex items-center gap-1.5">
                          <PlatformBrandIcon platform={p.platform} size="xs" />
                          <div className="flex flex-col leading-none">
                            <span className="text-slate-800 dark:text-slate-200 font-semibold text-xs">
                              {p.username || p.platform}
                            </span>
                            {p.password && (
                              <span
                                className="text-[10px] font-mono text-slate-400 dark:text-[#9DA2B4] mt-0.5 cursor-default"
                                title="Senha capturada do arquivo txt"
                              >
                                {p.password.replace(/./g, '•')}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : p.username ? (
                        <div className="flex flex-col leading-none">
                          <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono text-xs">
                            {p.username}
                          </span>
                          {p.password && (
                            <span
                              className="text-[10px] font-mono text-slate-400 dark:text-[#9DA2B4] mt-0.5 cursor-default"
                              title="Senha capturada do arquivo txt"
                            >
                              {p.password.replace(/./g, '•')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-[#6C7284]">-</span>
                      )}

                      {p.initial_urls && p.initial_urls.length > 0 && (
                        <span
                          title={`Abas abertas no perfil:\n${p.initial_urls.join('\n')}`}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 text-[10px]"
                        >
                          <ExternalLink size={9} />
                          {p.initial_urls.length} aba{p.initial_urls.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Grupo */}
                  <td className="px-3 py-2 text-slate-600 dark:text-[#C8CBD4]">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-[11px] font-medium">
                      {displayGroup}
                    </span>
                  </td>

                  {/* Proxy / Conexão */}
                  <td className="px-3 py-2 font-mono">
                    {proxyStrategy === 'none' ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-sans font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Conexão Direta (Sem Proxy)</span>
                      </div>
                    ) : proxyStrategy === 'override' ? (
                      customProxyHost ? (
                        <div className="flex items-center gap-1.5">
                          <IpSuccessIcon size={14} />
                          <span className="text-xs text-[#7C3AED] dark:text-[#A78BFA] font-medium">
                            {customProxyHost}{customProxyPort ? `:${customProxyPort}` : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-[#9DA2B4] uppercase">
                            ({customProxyType})
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-500 text-xs font-sans">
                          Proxy do lote incompleto
                        </span>
                      )
                    ) : hasFileProxy ? (
                      <div className="flex items-center gap-1.5">
                        <IpSuccessIcon size={14} />
                        <span className="text-xs text-slate-800 dark:text-white font-medium">
                          {fileProxyDesc}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#9DA2B4] uppercase">
                          ({p.proxy_type || 'http'})
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-[#9DA2B4] select-none text-[11px] font-sans">
                        Direta (Sem Proxy)
                      </span>
                    )}
                  </td>

                  {/* Cookies */}
                  <td className="px-3 py-2">
                    {p.cookieCount > 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Cookie size={13} />
                        <span>{p.cookieCount} cookies</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-[#9DA2B4]">-</span>
                    )}
                  </td>

                  {/* Resolução */}
                  <td className="px-3 py-2 font-mono text-slate-600 dark:text-[#9DA2B4]">
                    {p.screen_width && p.screen_height
                      ? `${p.screen_width}x${p.screen_height}`
                      : '-'}
                  </td>

                  {/* Ação */}
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Remover este perfil da lista"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
