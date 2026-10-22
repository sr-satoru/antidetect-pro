import React from 'react';
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Play,
  CircleX,
  Upload,
  FolderInput,
  ExternalLink,
  Trash2,
  MoreHorizontal,
  Tag,
  RotateCw,
} from 'lucide-react';

interface HeaderTabelaProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedGroup?: string;
  onGroupChange?: (g: string) => void;
  selectedIds?: (string | number)[];
  onStartSelected?: () => void;
  onStopSelected?: () => void;
  onDeleteSelected?: () => void;
  onRefresh?: () => void;
  onOpenTagFilter?: () => void;
  onOpenMoreOptions?: () => void;
  isSyncing?: boolean;
  [key: string]: any;
}

export const HeaderTabela: React.FC<HeaderTabelaProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedGroup = 'Todos os grupos',
  onGroupChange,
  selectedIds = [],
  onStartSelected,
  onStopSelected,
  onDeleteSelected,
  onRefresh,
  onOpenTagFilter,
  onOpenMoreOptions,
  isSyncing = false,
}) => {
  const hasSelected = selectedIds.length > 0;

  return (
    <div className="flex flex-col gap-2.5 shrink-0 select-none pb-1">
      {/* ============================================================== */}
      {/* LINHA 1: DROPDOWN GRUPO + SEARCH INPUT COM FILTRO INTEGRADO    */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* 1. Dropdown "Todos os grupos" */}
        <div className="relative">
          <select
            value={selectedGroup}
            onChange={(e) => onGroupChange?.(e.target.value)}
            className="h-9 pl-3.5 pr-8 rounded-md bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] hover:border-slate-300 dark:hover:border-[#848D97] text-[13px] text-slate-700 dark:text-[#848D97] appearance-none cursor-pointer focus:outline-hidden transition-colors shadow-2xs"
          >
            <option value="Todos os grupos">Todos os grupos</option>
            <option value="Desagrupado">Desagrupado</option>
            <option value="Tráfego Pago">Tráfego Pago</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#848D97] pointer-events-none"
          />
        </div>

        {/* 2. Campo de Pesquisa com SlidersHorizontal integrado */}
        <div className="relative w-96 sm:w-[460px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#848D97]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Pesquisa ou novos critérios de pesquisa"
            className="w-full h-9 bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] focus:border-[#238636] dark:focus:border-[#2ea043] text-slate-900 dark:text-[#E6EDF3] text-[13px] pl-9 pr-8 rounded-md placeholder-slate-400 dark:placeholder-[#848D97] focus:outline-hidden transition-colors shadow-2xs"
          />
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#848D97] hover:text-slate-700 dark:hover:text-[#E6EDF3] transition-colors cursor-pointer"
            title="Critérios avançados de pesquisa"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* LINHA 2: BOTÕES DE AÇÃO FLAT                                   */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Lado Esquerdo: Ações */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 1. Abrir */}
          <button
            type="button"
            onClick={onStartSelected}
            className="h-[38px] px-4.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-[14px] font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-[#238636]/20 active:scale-[0.98]"
            title="Abrir"
          >
            <Play size={14} fill="currentColor" />
            <span>Abrir</span>
          </button>

          {/* 2. Fechar */}
          <button
            type="button"
            onClick={onStopSelected}
            disabled={!hasSelected}
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#161B22] disabled:hover:text-slate-600 dark:disabled:hover:text-[#848D97]"
            title="Fechar"
          >
            <CircleX size={14} />
            <span>Fechar</span>
          </button>

          {/* 4. Exportar */}
          <button
            type="button"
            disabled={!hasSelected}
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#161B22] disabled:hover:text-slate-600 dark:disabled:hover:text-[#848D97]"
            title="Exportar"
          >
            <Upload size={14} />
            <span>Exportar</span>
          </button>

          {/* 5. Mover */}
          <button
            type="button"
            disabled={!hasSelected}
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#161B22] disabled:hover:text-slate-600 dark:disabled:hover:text-[#848D97]"
            title="Mover"
          >
            <FolderInput size={14} />
            <span>Mover</span>
          </button>

          {/* 6. Partilhar */}
          <button
            type="button"
            disabled={!hasSelected}
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#161B22] disabled:hover:text-slate-600 dark:disabled:hover:text-[#848D97]"
            title="Partilhar"
          >
            <ExternalLink size={14} />
            <span>Partilhar</span>
          </button>

          {/* 7. Lixeira */}
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!hasSelected}
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#161B22] hover:bg-red-50 dark:hover:bg-[#f85149]/15 hover:text-red-600 dark:hover:text-[#f85149] border border-slate-200 dark:border-[#30363D] hover:border-red-200 dark:hover:border-[#f85149]/40 text-slate-500 dark:text-[#848D97] flex items-center justify-center transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#161B22] disabled:hover:text-slate-500 dark:disabled:hover:text-[#848D97] disabled:hover:border-slate-200 dark:disabled:hover:border-[#30363D]"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>

          {/* 8. Mais Opções */}
          <button
            type="button"
            onClick={onOpenMoreOptions}
            disabled={!hasSelected}
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-500 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] flex items-center justify-center transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#161B22] disabled:hover:text-slate-500 dark:disabled:hover:text-[#848D97]"
            title="Mais opções"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Lado Direito: Tag e Atualizar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenTagFilter}
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-slate-500 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] hover:bg-slate-50 dark:hover:bg-[#21262D] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Filtrar por Tags"
          >
            <Tag size={14} />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#21262D] border border-slate-200 dark:border-[#30363D] text-slate-500 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] flex items-center justify-center transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            title={isSyncing ? "Sincronizando com a nuvem..." : "Atualizar lista"}
          >
            <RotateCw size={14} className={isSyncing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderTabela;
