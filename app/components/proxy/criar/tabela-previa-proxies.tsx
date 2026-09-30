import React from 'react';
import { Search, Loader2, Trash2, Globe, ShieldCheck } from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTestAll}
            disabled={!hasValidProxies || isChecking}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-[#20222C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:border-[#00FF66]/50 hover:bg-[#272935] hover:text-[#00FF66] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:bg-[#20222C] disabled:hover:text-white"
            title={
              hasValidProxies
                ? 'Testar conexões com os proxies informados'
                : 'Insira ao menos um formato de proxy válido para verificar'
            }
          >
            {isChecking ? (
              <Loader2 size={13} className="animate-spin text-[#00FF66]" />
            ) : (
              <Search size={13} />
            )}
            <span>Verificar Conexão</span>
          </button>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#A6ABB9] transition-colors select-none hover:text-white">
            <Checkbox
              size="sm"
              checked={checkDuplicates}
              onChange={(e) => setCheckDuplicates(e.target.checked)}
            />
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-[#00FF66]/80" />
              <span>Verificar duplicatas</span>
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11.5px] font-medium text-[#C8CBD4]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                items.length > 0 ? 'bg-[#00FF66]' : 'bg-[#6C7082]'
              }`}
            />
            <span>
              {items.length}{' '}
              {items.length === 1 ? 'proxy detectado' : 'proxies detectados'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Visualização dos Proxies Analisados */}
      <div className="max-h-[280px] min-h-[190px] overflow-x-auto overflow-y-auto rounded-xl border border-white/10 bg-[#16171D] shadow-inner [scrollbar-color:#3E4150_#16171D] [scrollbar-width:thin]">
        <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#1B1C23] text-[11px] font-semibold tracking-wider text-[#A6ABB9] uppercase select-none">
            <tr className="h-9">
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
          <tbody className="divide-y divide-white/5">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-3.5 py-2.5">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white uppercase">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-white">
                    {item.host}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#C4C7D5]">
                    {item.port}
                  </td>
                  <td className="px-3.5 py-2.5 text-[#9CA3AF]">
                    {item.user || '-'}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[#9CA3AF]">
                    {item.pass ? '••••••' : '-'}
                  </td>
                  <td className="max-w-[160px] truncate px-3.5 py-2.5 font-mono text-[11.5px] text-[#00FF66]/80">
                    {item.rotationLink || '-'}
                  </td>
                  <td className="max-w-[130px] truncate px-3.5 py-2.5 text-[#9CA3AF]">
                    {item.notes || '-'}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {!item.isValid ? (
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                        Formato inválido
                      </span>
                    ) : item.status === 'checking' ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-[#A6ABB9]">
                        <Loader2
                          size={12}
                          className="animate-spin text-[#00FF66]"
                        />
                        <span>Testando...</span>
                      </span>
                    ) : item.status === 'active' ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11.5px] font-medium text-[#00FF66]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00FF66] shadow-[0_0_6px_rgba(0,255,102,0.6)]" />
                        <span>{item.outboundIp}</span>
                      </span>
                    ) : item.status === 'auth_error' ? (
                      <span
                        className="flex items-center gap-1.5 font-mono text-[11.5px] text-amber-400"
                        title="Erro de autenticação: usuário ou senha incorretos"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span>Erro autenticação</span>
                      </span>
                    ) : item.status === 'timeout' ? (
                      <span
                        className="flex items-center gap-1.5 font-mono text-[11.5px] text-orange-400"
                        title="Tempo limite esgotado"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                        <span>Tempo esgotado</span>
                      </span>
                    ) : item.status === 'connection_error' ? (
                      <span
                        className="flex items-center gap-1.5 font-mono text-[11.5px] text-red-400"
                        title="Falha de conexão: host inacessível ou porta fechada"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        <span>Falha de conexão</span>
                      </span>
                    ) : item.status === 'error' ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        <span>{item.outboundIp}</span>
                      </span>
                    ) : (
                      <span className="text-[#6C6F7E]">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="cursor-pointer text-[#6C6F7E] opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                      title="Remover linha"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center select-none">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#8E92A2]">
                      <Globe size={18} />
                    </div>
                    <p className="text-[12.5px] font-medium text-[#D1D5DF]">
                      Nenhum proxy detectado ainda
                    </p>
                    <p className="text-[11.5px] text-[#7E8294]">
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
