import React from 'react';
import { LinhaTabelaProxies } from './linha-tabela-proxies';
import { CadastroProxies } from './criar';
import { EditarProxies } from './editar';
import {
  SlidersHorizontal,
  Globe,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface TabelasProxiesProps {
  proxies: any[];
  selectedIds: (string | number)[];
  onSelectProxy: (id: string | number) => void;
  onSelectAll: () => void;
  onTestProxy: (id: string | number) => void;
  onEditProxy: (proxy: any) => void;
  onDeleteProxy: (id: string | number) => void;
  isAddingOrEditing?: boolean;
  editingProxy?: any | null;
  onCloseCadastro?: () => void;
  onSaveCadastro?: (data: any | any[]) => void;
}

export const TabelasProxies: React.FC<TabelasProxiesProps> = ({
  proxies,
  selectedIds,
  onSelectProxy,
  onSelectAll,
  onTestProxy,
  onEditProxy,
  onDeleteProxy,
  isAddingOrEditing = false,
  editingProxy = null,
  onCloseCadastro = () => {},
  onSaveCadastro = () => {},
}) => {
  const isAllSelected =
    proxies.length > 0 && selectedIds.length === proxies.length;
  const activeCount = proxies.filter((p) => p.status === 'active').length;
  const errorCount = proxies.filter((p) => p.status === 'error').length;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#3E404D] bg-[#24252B] shadow-xs">
      {isAddingOrEditing ? (
        <CadastroProxies onClose={onCloseCadastro} onSave={onSaveCadastro} />
      ) : (
        <>
          {/* Scrollable Table Area */}
          <div className="flex-1 [scrollbar-width:thin] [scrollbar-color:#44444C_#141418] overflow-x-auto overflow-y-visible [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#44444C] [&::-webkit-scrollbar-thumb:hover]:bg-[#DFE104] [&::-webkit-scrollbar-track]:bg-[#141418]">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
              {/* Header */}
              <thead className="sticky top-0 z-20 border-b border-[#3E404D] bg-[#24252B] text-[11px] font-semibold tracking-wider text-[#C8CBD4] uppercase select-none">
                <tr className="h-11">
                  <th className="w-[38px] max-w-[38px] min-w-[38px] px-3.5 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={onSelectAll}
                      aria-label="Selecionar todos"
                      className="h-3.5 w-3.5 cursor-pointer rounded accent-[#DFE104]"
                    />
                  </th>
                  <th className="w-[70px] min-w-[70px] px-3.5 py-2.5">ID</th>
                  <th className="w-[200px] min-w-[200px] px-3.5 py-2.5">
                    Nome do Proxy
                  </th>
                  <th className="w-[100px] min-w-[100px] px-3.5 py-2.5">
                    Tipo
                  </th>
                  <th className="w-[210px] min-w-[210px] px-3.5 py-2.5">
                    Host & Porta
                  </th>
                  <th className="w-[180px] min-w-[180px] px-3.5 py-2.5">
                    Credenciais
                  </th>
                  <th className="w-[180px] min-w-[180px] px-3.5 py-2.5">
                    Localização / IP
                  </th>
                  <th className="w-[130px] min-w-[130px] px-3.5 py-2.5">
                    Status & Latência
                  </th>
                  <th className="w-[120px] min-w-[120px] px-3.5 py-2.5">
                    Perfis Vinculados
                  </th>
                  <th className="w-[130px] min-w-[130px] px-3.5 py-2.5">
                    Última Checagem
                  </th>
                  <th className="sticky right-0 z-20 w-[120px] max-w-[120px] min-w-[120px] bg-[#24252B] px-3 py-2.5 text-center">
                    Ações
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {proxies.length > 0 ? (
                  proxies.map((proxy, index) => (
                    <LinhaTabelaProxies
                      key={proxy.id}
                      index={index}
                      proxy={proxy}
                      isSelected={selectedIds.includes(proxy.id)}
                      onSelect={onSelectProxy}
                      onTest={onTestProxy}
                      onEdit={onEditProxy}
                      onDelete={onDeleteProxy}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-16 text-center text-[#8E92A2]"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#333541] bg-[#1C1D24] text-[#7E8294]">
                          <Globe size={22} />
                        </div>
                        <div>
                          <span className="mb-0.5 block text-sm font-medium text-white">
                            Nenhum proxy cadastrado ou encontrado
                          </span>
                          <p className="text-xs text-[#6C6F7E]">
                            Adicione um novo proxy individual ou importe em lote
                            pelo botão acima.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer com Estatísticas Rápidas */}
          <div className="flex h-10 shrink-0 items-center justify-between border-t border-[#3E404D] bg-[#1E1F26] px-4 text-xs text-[#9EA2AE] select-none">
            <div className="flex items-center gap-4">
              <span>
                Total: <strong className="text-white">{proxies.length}</strong>{' '}
                proxies
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                <span>{activeCount} ativos</span>
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                  <span>{errorCount} com erro</span>
                </span>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="font-medium text-[#DFE104]">
                {selectedIds.length} proxy{selectedIds.length > 1 ? 's' : ''}{' '}
                selecionado{selectedIds.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Popup Simples de Edição de Proxy */}
      {editingProxy && (
        <EditarProxies
          proxy={editingProxy}
          onClose={onCloseCadastro}
          onSave={onSaveCadastro}
        />
      )}
    </div>
  );
};

export default TabelasProxies;
