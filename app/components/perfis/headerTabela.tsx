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
            className="h-10 pl-3.5 pr-8 rounded-lg bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] hover:border-slate-300 dark:hover:border-[#4B5063] text-[13px] text-slate-700 dark:text-[#E2E4EC] appearance-none cursor-pointer focus:outline-hidden transition-colors shadow-xs"
          >
            <option value="Todos os grupos">Todos os grupos</option>
            <option value="Desagrupado">Desagrupado</option>
            <option value="Tráfego Pago">Tráfego Pago</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4] pointer-events-none"
          />
        </div>

        {/* 2. Campo de Pesquisa com SlidersHorizontal integrado */}
        <div className="relative w-96 sm:w-[460px]">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Pesquisa ou novos critérios de pesquisa"
            className="w-full h-10 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-slate-400 dark:focus:border-[#7C3AED] text-slate-900 dark:text-white text-[13px] pl-10 pr-9 rounded-lg placeholder-slate-400 dark:placeholder-[#6C7284] focus:outline-hidden transition-colors shadow-xs"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4] hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Critérios avançados de pesquisa"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* LINHA 2: BOTÕES DE AÇÃO FLAT COM PROPORÇÃO EXTENSÕES           */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Lado Esquerdo: Ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Abrir */}
          <button
            type="button"
            onClick={onStartSelected}
            className="h-[38px] px-4.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13.5px] font-medium flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
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
            className="h-[38px] px-3.5 rounded-lg bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] border border-slate-200/80 dark:border-[#2D3039] text-slate-700 dark:text-[#E2E4EC] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1F2026] disabled:hover:text-slate-700 dark:disabled:hover:text-[#E4E6EE]"
            title="Fechar"
          >
            <CircleX size={15} />
            <span>Fechar</span>
          </button>

          {/* 4. Exportar */}
          <button
            type="button"
            disabled={!hasSelected}
            className="h-[38px] px-3.5 rounded-lg bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] border border-slate-200/80 dark:border-[#2D3039] text-slate-700 dark:text-[#E2E4EC] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1F2026] disabled:hover:text-slate-700 dark:disabled:hover:text-[#E4E6EE]"
            title="Exportar"
          >
            <Upload size={15} />
            <span>Exportar</span>
          </button>

          {/* 5. Mover */}
          <button
            type="button"
            disabled={!hasSelected}
            className="h-[38px] px-3.5 rounded-lg bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] border border-slate-200/80 dark:border-[#2D3039] text-slate-700 dark:text-[#E2E4EC] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1F2026] disabled:hover:text-slate-700 dark:disabled:hover:text-[#E4E6EE]"
            title="Mover"
          >
            <FolderInput size={15} />
            <span>Mover</span>
          </button>

          {/* 6. Partilhar */}
          <button
            type="button"
            disabled={!hasSelected}
            className="h-[38px] px-3.5 rounded-lg bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] border border-slate-200/80 dark:border-[#2D3039] text-slate-700 dark:text-[#E2E4EC] hover:text-slate-900 dark:hover:text-white text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1F2026] disabled:hover:text-slate-700 dark:disabled:hover:text-[#E4E6EE]"
            title="Partilhar"
          >
            <ExternalLink size={15} />
            <span>Partilhar</span>
          </button>

          {/* 7. Lixeira */}
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!hasSelected}
            className="h-[38px] w-[38px] rounded-lg bg-white dark:bg-[#1F2026] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 border border-slate-200/80 dark:border-[#2D3039] hover:border-red-200 dark:hover:border-red-500/30 text-slate-500 dark:text-[#9DA2B4] flex items-center justify-center transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1F2026] disabled:hover:text-slate-500 dark:disabled:hover:text-[#6C7284] disabled:hover:border-slate-200/80 dark:disabled:hover:border-[#2D3039]"
            title="Excluir"
          >
            <Trash2 size={15} />
          </button>

          {/* 8. Mais Opções */}
          <button
            type="button"
            onClick={onOpenMoreOptions}
            disabled={!hasSelected}
            className="h-[38px] w-[38px] rounded-lg bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] border border-slate-200/80 dark:border-[#2D3039] text-slate-500 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#1F2026] disabled:hover:text-slate-500 dark:disabled:hover:text-[#6C7284]"
            title="Mais opções"
          >
            <MoreHorizontal size={15} />
          </button>
        </div>

        {/* Lado Direito: Tag e Atualizar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTagFilter}
            className="h-[38px] w-[38px] rounded-lg bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] text-slate-500 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#282A33] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            title="Filtrar por Tags"
          >
            <Tag size={15} />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            className="h-[38px] w-[38px] rounded-lg bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] border border-slate-200/80 dark:border-[#2D3039] text-slate-500 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            title={isSyncing ? "Sincronizando com a nuvem..." : "Atualizar lista"}
          >
            <RotateCw size={15} className={isSyncing ? "animate-spin text-[#7C3AED] dark:text-[#A78BFA]" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderTabela;
