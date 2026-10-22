import React from 'react';
import { Trash2, ShieldCheck, Cookie } from 'lucide-react';
import { IpSuccessIcon } from '../icons';
import { OsIcon } from '../ui/os-icon';
import type { ImportPreviewItem } from '@/services/importar-perfil/service.types';

interface PreviewTableProps {
  profiles: ImportPreviewItem[];
  onRemoveItem: (index: number) => void;
  defaultGroup: string;
  overrideGroup: boolean;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({
  profiles,
  onRemoveItem,
  defaultGroup,
  overrideGroup,
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
              <th className="w-[48px] px-3.5 py-2 text-center">#</th>
              <th className="px-3.5 py-2">Nome do Perfil</th>
              <th className="px-3.5 py-2">Grupo</th>
              <th className="px-3.5 py-2">Proxy / IP</th>
              <th className="px-3.5 py-2">Cookies</th>
              <th className="px-3.5 py-2">Resolução</th>
              <th className="w-[50px] px-3.5 py-2 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {profiles.map((p, idx) => {
              const displayGroup = overrideGroup && defaultGroup ? defaultGroup : p.group || defaultGroup || 'Desagrupado';
              const hasProxy = Boolean(p.proxy_host && p.proxy_host.trim());
              const proxyDesc = hasProxy
                ? `${p.proxy_host}${p.proxy_port ? `:${p.proxy_port}` : ''}`
                : '-';

              return (
                <tr
                  key={`${p.name}-${idx}`}
                  className="h-11 hover:bg-slate-50 dark:hover:bg-[#252733] transition-colors"
                >
                  <td className="px-3.5 py-2 text-center font-mono text-xs text-slate-400 dark:text-[#6C7284]">
                    {idx + 1}
                  </td>

                  <td className="px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <OsIcon os={p.os || 'windows'} size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {p.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-3.5 py-2 text-slate-600 dark:text-[#C8CBD4]">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-[11px] font-medium">
                      {displayGroup}
                    </span>
                  </td>

                  <td className="px-3.5 py-2 font-mono">
                    {hasProxy ? (
                      <div className="flex items-center gap-1.5">
                        <IpSuccessIcon size={14} />
                        <span className="text-xs text-slate-800 dark:text-white font-medium">
                          {proxyDesc}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#9DA2B4] uppercase">
                          ({p.proxy_type || 'http'})
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-[#9DA2B4] select-none">-</span>
                    )}
                  </td>

                  <td className="px-3.5 py-2">
                    {p.cookieCount > 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Cookie size={13} />
                        <span>{p.cookieCount} cookies</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-[#9DA2B4]">-</span>
                    )}
                  </td>

                  <td className="px-3.5 py-2 font-mono text-slate-600 dark:text-[#9DA2B4]">
                    {p.screen_width && p.screen_height
                      ? `${p.screen_width}x${p.screen_height}`
                      : '-'}
                  </td>

                  <td className="px-3.5 py-2 text-center">
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
