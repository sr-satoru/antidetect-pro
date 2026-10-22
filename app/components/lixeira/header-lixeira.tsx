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
              className="h-10 pl-3.5 pr-8 rounded-lg bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] hover:border-slate-300 dark:hover:border-[#4B5063] text-[13px] text-slate-700 dark:text-[#E2E4EC] appearance-none cursor-pointer focus:outline-hidden transition-colors shadow-xs"
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
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4]"
            />
          </div>

          {/* Campo de Busca */}
          <div className="relative w-80 sm:w-96">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar por nome, ID ou IP..."
              className="w-full h-10 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] pl-10 pr-4 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] focus:border-slate-400 dark:focus:border-[#7C3AED] focus:outline-hidden transition-colors shadow-xs"
            />
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Atualizar lista"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-500 hover:text-slate-900 dark:text-[#9DA2B4] hover:border-slate-300 dark:hover:border-[#4B5063] dark:hover:bg-[#282A33] dark:hover:text-white transition-colors shadow-xs cursor-pointer"
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
            className={`flex h-[38px] items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-all ${
              selectedCount > 0
                ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs cursor-pointer active:scale-[0.98]'
                : 'border border-slate-200/80 dark:border-[#2D3039]/50 bg-slate-100 dark:bg-[#1F2026]/50 text-slate-400 dark:text-[#82889A] opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={14} />
            <span>Restaurar Selecionados</span>
            {selectedCount > 0 && (
              <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[11px] font-semibold text-white">
                {selectedCount}
              </span>
            )}
          </button>

          {/* Botão Excluir Definitivamente Selecionados */}
          <button
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className={`flex h-[38px] items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-all ${
              selectedCount > 0
                ? 'border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 shadow-xs cursor-pointer'
                : 'border border-slate-200/80 dark:border-[#2D3039]/50 bg-slate-100 dark:bg-[#1F2026]/50 text-slate-400 dark:text-[#82889A] opacity-50 cursor-not-allowed'
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
            className={`flex h-[38px] items-center gap-2 rounded-lg border px-3.5 text-[13px] font-medium transition-all ${
              totalCount > 0
                ? 'border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-700 dark:text-[#E2E4EC] hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 shadow-xs cursor-pointer'
                : 'border border-slate-200/80 dark:border-[#2D3039]/50 bg-slate-100 dark:bg-[#1F2026]/50 text-slate-400 dark:text-[#82889A] opacity-40 cursor-not-allowed'
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
