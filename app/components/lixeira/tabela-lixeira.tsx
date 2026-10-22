import React from 'react';
import {
  LinhaTabelaLixeira,
  ItemLixeira,
} from './linha-tabela-lixeira';
import { Trash2, AlertCircle } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface TabelaLixeiraProps {
  items: ItemLixeira[];
  selectedIds: (string | number)[];
  onSelectAll: () => void;
  onSelectItem: (id: string | number) => void;
  onRestore?: (id: string | number) => void;
  onDeletePermanent?: (id: string | number) => void;
}

export const TabelaLixeira: React.FC<TabelaLixeiraProps> = ({
  items,
  selectedIds,
  onSelectAll,
  onSelectItem,
  onRestore,
  onDeletePermanent,
}) => {
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] shadow-xs">
      <div className="flex-1 custom-scrollbar overflow-auto relative">
        <table className="min-w-full w-full border-collapse text-left text-xs whitespace-nowrap">
          {/* Header */}
          <thead className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] text-[11.5px] font-semibold tracking-wider text-slate-600 dark:text-[#9DA2B4] uppercase select-none">
            <tr className="h-12">
              <th className="w-[44px] min-w-[44px] max-w-[44px] px-2 py-2 text-center">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={onSelectAll}
                    aria-label="Selecionar todos os itens da lixeira"
                  />
                </div>
              </th>
              <th className="w-[75px] min-w-[75px] px-3.5 py-2">ID Original</th>
              <th className="w-[230px] min-w-[230px] px-3.5 py-2">Perfil</th>
              <th className="w-[150px] min-w-[150px] px-3.5 py-2">Grupo</th>
              <th className="w-[180px] min-w-[180px] px-3.5 py-2">IP & Proxy</th>
              <th className="w-[180px] min-w-[180px] px-3.5 py-2">Data e Hora de Exclusão</th>
              <th className="w-[190px] min-w-[190px] px-3.5 py-2">Exclusão Definitiva (30 dias)</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <LinhaTabelaLixeira
                  key={item.id}
                  item={item}
                  index={index}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={onSelectItem}
                />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-500 dark:text-[#9DA2B4]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] text-slate-400 dark:text-[#9DA2B4]">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <span className="mb-0.5 block text-sm font-semibold text-slate-900 dark:text-white">
                        A lixeira está vazia
                      </span>
                      <p className="text-xs text-slate-500 dark:text-[#9DA2B4]">
                        Nenhum perfil removido no momento. Perfis excluídos aparecerão aqui.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer com Políticas de Retenção */}
      <div className="flex h-12 shrink-0 items-center justify-between border-t border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] px-4 text-xs text-slate-600 dark:text-[#9DA2B4] select-none">
        <div className="flex items-center gap-4">
          <span>
            Total na lixeira: <strong className="text-slate-900 dark:text-white">{items.length}</strong> perfis
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex text-[11px] text-slate-500 dark:text-[#9DA2B4]">
            <AlertCircle size={13} className="text-[#7C3AED] dark:text-[#A78BFA]" />
            <span>Itens excluídos são removidos automaticamente após 30 dias de retenção.</span>
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="font-semibold text-slate-900 dark:text-white">
            {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabelaLixeira;
