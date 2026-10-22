import React from 'react';
import { Search, Loader2, Trash2, Globe, ShieldCheck } from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tooltip } from '../../ui/tooltip';
import { ParsedProxyItem } from '@/services/proxies/service.proxies';

export interface TabelaPreviaProxiesProps {
  items: ParsedProxyItem[];
  isChecking: boolean;
  hasValidProxies: boolean;
  checkDuplicates: boolean;
  setCheckDuplicates: (check: boolean) => void;
  onTestAll: () => void;
  onRemoveItem: (index: number) => void;
}

export const TabelaPreviaProxies: React.FC<TabelaPreviaProxiesProps> = ({
  items,
  isChecking,
  hasValidProxies,
  checkDuplicates,
  setCheckDuplicates,
  onTestAll,
  onRemoveItem,
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Barra de Ações: Verificar proxy, Verificar duplicatas, Badge de contagem */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-[#2D3039] pt-3 select-none">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTestAll}
            disabled={!hasValidProxies || isChecking}
            className="h-[38px] gap-2 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 text-[13px] font-medium text-slate-700 dark:text-[#E2E4EC] hover:bg-slate-50 dark:hover:bg-[#282A33]"
          >
            {isChecking ? (
              <Loader2 size={14} className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]" />
            ) : (
              <Search size={14} />
            )}
            <span>Verificar Conexões</span>
          </Button>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-[#9DA2B4] dark:hover:text-white transition-colors select-none">
            <Checkbox
              size="sm"
              checked={checkDuplicates}
              onChange={(e) => setCheckDuplicates(e.target.checked)}
            />
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#7C3AED] dark:text-[#A78BFA]" />
              <span>Ignorar duplicatas</span>
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={items.length > 0 ? 'success' : 'secondary'} className="px-2.5 py-1 text-xs gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                items.length > 0 ? 'bg-[#7C3AED] dark:bg-[#A78BFA]' : 'bg-slate-400 dark:bg-[#8E92A2]'
              }`}
            />
            <span>
              {items.length}{' '}
              {items.length === 1 ? 'proxy detectado' : 'proxies detectados'}
            </span>
          </Badge>
        </div>
      </div>

      {/* Tabela de Visualização dos Proxies Analisados */}
      <div className="max-h-[260px] min-h-[170px] overflow-x-auto overflow-y-auto rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] shadow-xs [scrollbar-width:thin]">
        <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 z-10 border-b border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] text-[11px] font-semibold tracking-wider text-slate-600 dark:text-[#9DA2B4] uppercase select-none">
            <tr className="h-10">
              <th className="px-3.5 py-2">Tipo</th>
              <th className="px-3.5 py-2">Host / IP</th>
              <th className="px-3.5 py-2">Porta</th>
              <th className="px-3.5 py-2">Usuário</th>
              <th className="px-3.5 py-2">Senha</th>
              <th className="px-3.5 py-2">Link Rotação</th>
              <th className="px-3.5 py-2">Observação</th>
              <th className="px-3.5 py-2">Status / IP Saída</th>
              <th className="w-9 px-2 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-slate-50 dark:hover:bg-[#32343C]"
                >
                  <td className="px-3.5 py-2.5">
                    <Badge variant="secondary" className="font-mono text-[10px] uppercase font-bold">
                      {item.type}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-slate-900 dark:text-white font-medium">
                    {item.host}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-slate-700 dark:text-[#C4C7D5]">
                    {item.port}
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-500 dark:text-[#9CA3AF]">
                    {item.user || '-'}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-slate-500 dark:text-[#9CA3AF]">
                    {item.pass ? '••••••' : '-'}
                  </td>
                  <td className="max-w-[160px] truncate px-3.5 py-2.5 font-mono text-[11px] text-emerald-600 dark:text-[#00FF66] font-medium">
                    {item.rotationLink || '-'}
                  </td>
                  <td className="max-w-[130px] truncate px-3.5 py-2.5 text-slate-500 dark:text-[#9CA3AF]">
                    {item.notes || '-'}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {!item.isValid ? (
                      <Badge variant="warning" className="text-[10px]">
                        Formato inválido
                      </Badge>
                    ) : item.status === 'checking' ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-slate-600 dark:text-[#A6ABB9]">
                        <Loader2
                          size={12}
                          className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]"
                        />
                        <span>Testando...</span>
                      </span>
                    ) : item.status === 'active' ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        <span>{item.outboundIp}</span>
                      </span>
                    ) : item.status === 'auth_error' ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Erro autenticação
                      </Badge>
                    ) : item.status === 'timeout' ? (
                      <Badge variant="warning" className="text-[10px]">
                        Tempo esgotado
                      </Badge>
                    ) : item.status === 'connection_error' ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Falha de conexão
                      </Badge>
                    ) : item.status === 'error' ? (
                      <Badge variant="destructive" className="text-[10px]">
                        {item.outboundIp || 'Erro'}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 dark:text-[#6C6F7E]">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <Tooltip content="Remover linha">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        className="cursor-pointer text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 dark:text-[#6C6F7E] dark:hover:text-red-400 p-1 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center select-none">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-[#9DA2B4]">
                      <Globe size={18} />
                    </div>
                    <p className="text-[12.5px] font-medium text-slate-800 dark:text-[#D1D5DF]">
                      Nenhum proxy detectado ainda
                    </p>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#7E8294]">
                      Cole suas linhas no campo acima para gerar a tabela de
                      prévia automaticamente.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TabelaPreviaProxies;
