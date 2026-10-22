import React from 'react';
import { LinhaTabelaProxies } from './linha-tabela-proxies';
import { CadastroProxies } from './criar';
import { EditarProxies } from './editar';
import {
  Globe,
  Plus,
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';

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
  onOpenCadastro?: () => void;
  hasFiltersApplied?: boolean;
  onClearFilters?: () => void;
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
  onOpenCadastro = () => {},
  hasFiltersApplied = false,
  onClearFilters = () => {},
}) => {
  const isAllSelected =
    proxies.length > 0 && selectedIds.length === proxies.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < proxies.length;
  const activeCount = proxies.filter((p) => p.status === 'active').length;
  const errorCount = proxies.filter((p) => p.status === 'error').length;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] shadow-xs">
      {isAddingOrEditing ? (
        <CadastroProxies onClose={onCloseCadastro} onSave={onSaveCadastro} />
      ) : (
        <>
          <div className="flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:thin]">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
              {/* Header */}
              <thead className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] text-[11.5px] font-semibold tracking-wider text-slate-600 dark:text-[#9DA2B4] uppercase select-none">
                <tr className="h-12">
                  <th className="w-[44px] min-w-[44px] max-w-[44px] px-2 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isSomeSelected}
                        onChange={onSelectAll}
                        aria-label="Selecionar todos os proxies"
                      />
                    </div>
                  </th>
                  <th className="w-[70px] min-w-[70px] px-3.5 py-2">ID</th>
                  <th className="w-[210px] min-w-[210px] px-3.5 py-2">
                    Nome do Proxy
                  </th>
                  <th className="w-[110px] min-w-[110px] px-3.5 py-2">
                    Tipo
                  </th>
                  <th className="w-[210px] min-w-[210px] px-3.5 py-2">
                    Host & Porta
                  </th>
                  <th className="w-[180px] min-w-[180px] px-3.5 py-2">
                    Credenciais
                  </th>
                  <th className="w-[180px] min-w-[180px] px-3.5 py-2">
                    Localização / IP
                  </th>
                  <th className="w-[130px] min-w-[130px] px-3.5 py-2">
                    Status & Latência
                  </th>
                  <th className="w-[120px] min-w-[120px] px-3.5 py-2">
                    Perfis Vinculados
                  </th>
                  <th className="w-[130px] min-w-[130px] px-3.5 py-2">
                    Última Checagem
                  </th>
                  <th className="sticky right-0 z-20 w-[120px] max-w-[120px] min-w-[120px] bg-[#F8F7F5] dark:bg-[#1F2026] px-3 py-2 text-center">
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
                      className="py-20 text-center text-slate-500 dark:text-[#9DA2B4]"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18191E] text-slate-400 dark:text-[#7E8294] shadow-xs">
                          <Globe size={26} />
                        </div>
                        {hasFiltersApplied ? (
                          <div className="space-y-1.5 max-w-sm">
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                              Nenhum proxy encontrado com estes filtros
                            </span>
                            <p className="text-xs text-slate-500 dark:text-[#7E8294]">
                              Tente mudar os termos de busca ou remover os filtros aplicados.
                            </p>
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={onClearFilters}
                              >
                                Limpar Filtros
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-w-sm">
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                              Nenhum proxy cadastrado ainda
                            </span>
                            <p className="text-xs text-slate-500 dark:text-[#7E8294]">
                              Adicione um proxy individualmente ou importe em lote utilizando os botões de ação acima.
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer com Estatísticas e Seleção */}
          <div className="flex h-12 shrink-0 items-center justify-between border-t border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] px-4 text-xs text-slate-600 dark:text-[#9DA2B4] select-none">
            <div className="flex items-center gap-4">
              <span>
                Total: <strong className="text-slate-900 dark:text-white">{proxies.length}</strong>{' '}
                {proxies.length === 1 ? 'proxy' : 'proxies'}
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
              <div className="font-semibold text-slate-900 dark:text-white text-xs">
                {selectedIds.length} proxy{selectedIds.length > 1 ? 's' : ''}{' '}
                selecionado{selectedIds.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Edição de Proxy */}
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
