import React from 'react';
import { Search, Loader2, Trash2 } from 'lucide-react';
import { ParsedProxyItem } from '@/utils/proxy-utils';

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
    <>
      {/* Barra de Ações: Verificar proxy, Verificar duplicatas, Agentes adicionados */}
      <div className="flex flex-wrap items-center gap-4 border-t border-[#2C2E38] pt-2 select-none">
        <button
          type="button"
          onClick={onTestAll}
          disabled={!hasValidProxies || isChecking}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#383A46] bg-[#1C1D23] px-3.5 py-1 text-xs font-medium text-[#A0A5B5] transition-colors hover:bg-[#282A33] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          title={
            hasValidProxies
              ? 'Testar conexões com os proxies informados'
              : 'Insira ao menos um formato de proxy válido para verificar'
          }
        >
          {isChecking ? (
            <Loader2 size={13} className="animate-spin text-[#2F80ED]" />
          ) : (
            <Search size={13} />
          )}
          <span>Verificar proxy</span>
        </button>

        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#A0A5B5] select-none hover:text-white">
          <input
            type="checkbox"
            checked={checkDuplicates}
            onChange={(e) => setCheckDuplicates(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded accent-[#1677FF]"
          />
          <span className="border-b border-dotted border-[#6C6F7E]">
            Verificar duplicatas
          </span>
        </label>

        <span className="text-xs text-[#8E92A2]">
          Agentes adicionados: {items.length}
        </span>
      </div>

      {/* Tabela de Visualização dos Proxies Analisados */}
      <div className="max-h-[260px] min-h-[170px] overflow-x-auto overflow-y-auto rounded-md border border-[#2C2E38] bg-[#17181D] [scrollbar-color:#3E4150_#17181D] [scrollbar-width:thin]">
        <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 z-10 border-b border-[#2C2E38] bg-[#1B1C22] text-[11px] font-medium text-[#8E92A2] select-none">
            <tr className="h-8">
              <th className="px-3 py-1.5 font-normal">Tipo de P...</th>
              <th className="px-3 py-1.5 font-normal">Máquina de Proxy</th>
              <th className="px-3 py-1.5 font-normal">Porta d...</th>
              <th className="px-3 py-1.5 font-normal">
                Nome do utilizador do proxy
              </th>
              <th className="px-3 py-1.5 font-normal">Senha do Proxy</th>
              <th className="px-3 py-1.5 font-normal">Mudar o URL IP</th>
              <th className="px-3 py-1.5 font-normal">Notas</th>
              <th className="px-3 py-1.5 font-normal">Outbound IP</th>
              <th className="w-8 px-2 py-1.5 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242630]">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-[#1E2028]"
                >
                  <td className="px-3 py-2 text-white uppercase">
                    {item.type}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#D2D5DF]">
                    {item.host}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#D2D5DF]">
                    {item.port}
                  </td>
                  <td className="px-3 py-2 text-[#9CA3AF]">
                    {item.user || '-'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#9CA3AF]">
                    {item.pass ? '••••••' : '-'}
                  </td>
                  <td className="max-w-[150px] truncate px-3 py-2 font-mono text-xs text-[#2F80ED]">
                    {item.rotationLink || '-'}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2 text-[#9CA3AF]">
                    {item.notes || '-'}
                  </td>
                  <td className="px-3 py-2">
                    {!item.isValid ? (
                      <span className="text-[11px] font-medium text-[#eab308]">
                        Formato inválido
                      </span>
                    ) : item.status === 'checking' ? (
                      <span className="flex items-center gap-1 text-[#2F80ED]">
                        <Loader2 size={11} className="animate-spin" />
                        Testando...
                      </span>
                    ) : item.status === 'active' ? (
                      <span className="flex items-center gap-1 font-mono text-[#10b981]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                        {item.outboundIp}
                      </span>
                    ) : item.status === 'auth_error' ? (
                      <span
                        className="flex items-center gap-1 font-mono text-[#f59e0b]"
                        title="Erro de autenticação: usuário ou senha incorretos"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                        Erro autenticação
                      </span>
                    ) : item.status === 'timeout' ? (
                      <span
                        className="flex items-center gap-1 font-mono text-[#f97316]"
                        title="Tempo limite esgotado"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                        Tempo esgotado
                      </span>
                    ) : item.status === 'connection_error' ? (
                      <span
                        className="flex items-center gap-1 font-mono text-[#ef4444]"
                        title="Falha de conexão: host inacessível ou porta fechada"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                        Falha conexão
                      </span>
                    ) : item.status === 'error' ? (
                      <span className="flex items-center gap-1 font-mono text-[#ef4444]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                        {item.outboundIp}
                      </span>
                    ) : (
                      <span className="text-[#6C6F7E]">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="opacity-0 transition-opacity group-hover:opacity-100 text-[#6C6F7E] hover:text-[#ef4444] cursor-pointer"
                      title="Remover linha"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="h-28 text-center text-[#5A5E6D]">
                  {/* Área escura vazia */}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TabelaPreviaProxies;
