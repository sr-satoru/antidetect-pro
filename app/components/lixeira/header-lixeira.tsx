import React from 'react';
import {
  Search,
  ChevronDown,
  RotateCcw,
  Trash2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

interface HeaderLixeiraProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  groups: string[];
  selectedCount: number;
  totalCount: number;
  onRestoreSelected: () => void;
  onDeleteSelected: () => void;
  onEmptyTrash: () => void;
  onRefresh?: () => void;
}

export const HeaderLixeira: React.FC<HeaderLixeiraProps> = ({
  searchQuery,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  groups,
  selectedCount,
  totalCount,
  onRestoreSelected,
  onDeleteSelected,
  onEmptyTrash,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col gap-3 shrink-0 select-none pb-2">
      {/* Barra de Filtro e Pesquisa */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown de Grupos */}
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={(e) => onGroupChange(e.target.value)}
              className="h-9 pl-3.5 pr-8 rounded-md bg-[#14151B] border border-[#2C2E38] hover:border-[#3E4150] text-[13px] text-[#A9ACB9] appearance-none cursor-pointer focus:outline-hidden transition-colors"
            >
              <option value="Todos os grupos">Todos os grupos</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6C6F7E]"
            />
          </div>

          {/* Campo de Busca */}
          <div className="relative w-80 sm:w-96">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6C6F7E]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar por nome, ID ou IP..."
              className="w-full h-9 rounded-md border border-[#2C2E38] bg-[#14151B] pl-9 pr-3 text-[13px] text-[#E1E4EE] placeholder-[#585B6A] focus:border-[#3E4150] focus:outline-hidden transition-colors"
            />
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Atualizar lista"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#2C2E38] bg-[#14151B] text-[#8E92A2] hover:border-[#3E4150] hover:text-white transition-colors"
            >
              <RotateCw size={14} />
            </button>
          )}
        </div>

        {/* Ações em Lote */}
        <div className="flex items-center gap-2">
          {/* Botão Restaurar Selecionados */}
          <button
            onClick={onRestoreSelected}
            disabled={selectedCount === 0}
            className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all ${
              selectedCount > 0
                ? 'border border-[#00FF66]/40 bg-[#00FF66]/10 text-[#00FF66] hover:bg-[#00FF66]/20 hover:border-[#00FF66]/70 shadow-xs'
                : 'border border-[#2C2E38] bg-[#181920] text-[#555866] opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={14} />
            <span>Restaurar Selecionados</span>
            {selectedCount > 0 && (
              <span className="ml-1 rounded-full bg-[#00FF66]/20 px-1.5 py-0.2 text-[11px] font-bold text-[#00FF66]">
                {selectedCount}
              </span>
            )}
          </button>

          {/* Botão Excluir Definitivamente Selecionados */}
          <button
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all ${
              selectedCount > 0
                ? 'border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/70 shadow-xs'
                : 'border border-[#2C2E38] bg-[#181920] text-[#555866] opacity-50 cursor-not-allowed'
            }`}
          >
            <Trash2 size={14} />
            <span>Excluir Selecionados</span>
          </button>

          {/* Botão Esvaziar Lixeira */}
          <button
            onClick={onEmptyTrash}
            disabled={totalCount === 0}
            title="Excluir permanentemente todos os itens da lixeira"
            className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-all ${
              totalCount > 0
                ? 'border-[#3E404D] bg-[#24252B] text-[#9EA2AE] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400'
                : 'border-[#2C2E38] bg-[#181920] text-[#555866] opacity-40 cursor-not-allowed'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Esvaziar Lixeira</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderLixeira;
