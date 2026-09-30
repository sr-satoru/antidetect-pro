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
              className="h-9 pl-3.5 pr-8 rounded-md bg-white dark:bg-[#14151B] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-[13px] text-slate-700 dark:text-[#A9ACB9] appearance-none cursor-pointer focus:outline-hidden transition-colors shadow-2xs"
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
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#6C6F7E]"
            />
          </div>

          {/* Campo de Busca */}
          <div className="relative w-80 sm:w-96">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#6C6F7E]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar por nome, ID ou IP..."
              className="w-full h-9 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] pl-9 pr-3 text-[13px] text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#585B6A] focus:border-emerald-500 dark:focus:border-white/30 focus:outline-hidden transition-colors shadow-2xs"
            />
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Atualizar lista"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14151B] text-slate-500 hover:text-slate-900 dark:text-[#8E92A2] hover:border-slate-300 dark:hover:border-white/20 dark:hover:text-white transition-colors shadow-2xs"
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
                ? 'border border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-[#00FF66]/40 dark:bg-[#00FF66]/10 dark:text-[#00FF66] dark:hover:bg-[#00FF66]/20 shadow-xs'
                : 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#14151B] text-slate-400 dark:text-[#555866] opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={14} />
            <span>Restaurar Selecionados</span>
            {selectedCount > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500/20 dark:bg-[#00FF66]/20 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-[#00FF66]">
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
                ? 'border border-red-500/30 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 shadow-xs'
                : 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#14151B] text-slate-400 dark:text-[#555866] opacity-50 cursor-not-allowed'
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
                ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#181920] text-slate-700 dark:text-[#9EA2AE] hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/50 dark:hover:bg-red-500/10 dark:hover:text-red-400 shadow-2xs'
                : 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#14151B] text-slate-400 dark:text-[#555866] opacity-40 cursor-not-allowed'
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
