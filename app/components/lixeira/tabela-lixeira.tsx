import React from 'react';
import {
  LinhaTabelaLixeira,
  ItemLixeira,
} from './linha-tabela-lixeira';
import { Trash2, AlertCircle } from 'lucide-react';

interface TabelaLixeiraProps {
  items: ItemLixeira[];
  selectedIds: number[];
  onSelectAll: () => void;
  onSelectItem: (id: number) => void;
  onRestore: (id: number) => void;
  onDeletePermanent: (id: number) => void;
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

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#3E404D] bg-[#24252B] shadow-xs">
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
              <th className="w-[75px] min-w-[75px] px-3.5 py-2.5">ID Original</th>
              <th className="w-[230px] min-w-[230px] px-3.5 py-2.5">Perfil</th>
              <th className="w-[150px] min-w-[150px] px-3.5 py-2.5">Grupo</th>
              <th className="w-[180px] min-w-[180px] px-3.5 py-2.5">IP & Proxy</th>
              <th className="w-[160px] min-w-[160px] px-3.5 py-2.5">Data de Exclusão</th>
              <th className="w-[140px] min-w-[140px] px-3.5 py-2.5">Tempo Restante</th>
              <th className="w-[130px] min-w-[130px] px-3.5 py-2.5">Excluído por</th>
              <th className="sticky right-0 z-20 w-[110px] max-w-[110px] min-w-[110px] bg-[#24252B] px-3 py-2.5 text-center">
                Ações
              </th>
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
                  onRestore={onRestore}
                  onDeletePermanent={onDeletePermanent}
                />
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-20 text-center text-[#8E92A2]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#333541] bg-[#1C1D24] text-[#7E8294]">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <span className="mb-0.5 block text-sm font-semibold text-white">
                        A lixeira está vazia
                      </span>
                      <p className="text-xs text-[#6C6F7E]">
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
      <div className="flex h-11 shrink-0 items-center justify-between border-t border-[#3E404D] bg-[#1E1F26] px-4 text-xs text-[#9EA2AE] select-none">
        <div className="flex items-center gap-4">
          <span>
            Total na lixeira: <strong className="text-white">{items.length}</strong> perfis
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex text-[11px] text-[#7E8294]">
            <AlertCircle size={13} className="text-[#DFE104]" />
            <span>Itens excluídos são removidos automaticamente após 7 dias de retenção.</span>
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="font-semibold text-[#DFE104]">
            {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabelaLixeira;
