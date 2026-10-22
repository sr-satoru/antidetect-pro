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
            className="h-9 pl-3.5 pr-8 rounded-md bg-white dark:bg-[#15151A] border border-slate-200 dark:border-[#2E2E38] hover:border-slate-300 dark:hover:border-[#41414E] text-[13px] text-slate-700 dark:text-[#C9C9D2] appearance-none cursor-pointer focus:outline-hidden transition-colors shadow-2xs"
          >
            <option value="Todos os grupos">Todos os grupos</option>
            <option value="Desagrupado">Desagrupado</option>
            <option value="Tráfego Pago">Tráfego Pago</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#90909D] pointer-events-none"
          />
        </div>

        {/* 2. Campo de Pesquisa com SlidersHorizontal integrado */}
        <div className="relative w-96 sm:w-[460px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#90909D]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Pesquisa ou novos critérios de pesquisa"
            className="w-full h-9 bg-white dark:bg-[#15151A] border border-slate-200 dark:border-[#2E2E38] focus:border-[#3366E6] dark:focus:border-[#5E88F0] text-slate-900 dark:text-[#F1F1F4] text-[13px] pl-9 pr-8 rounded-md placeholder-slate-400 dark:placeholder-[#66666F] focus:outline-hidden transition-colors shadow-2xs"
          />
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#90909D] hover:text-slate-700 dark:hover:text-[#F1F1F4] transition-colors cursor-pointer"
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
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#1A1A21] hover:bg-slate-50 dark:hover:bg-[#24242C] border border-slate-200 dark:border-[#2E2E38] text-slate-600 dark:text-[#C9C9D2] hover:text-slate-900 dark:hover:text-[#F1F1F4] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            title="Fechar"
          >
            <CircleX size={14} />
            <span>Fechar</span>
          </button>

          {/* 4. Exportar */}
          <button
            type="button"
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#1A1A21] hover:bg-slate-50 dark:hover:bg-[#24242C] border border-slate-200 dark:border-[#2E2E38] text-slate-600 dark:text-[#C9C9D2] hover:text-slate-900 dark:hover:text-[#F1F1F4] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            title="Exportar"
          >
            <Upload size={14} />
            <span>Exportar</span>
          </button>

          {/* 5. Mover */}
          <button
            type="button"
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#1A1A21] hover:bg-slate-50 dark:hover:bg-[#24242C] border border-slate-200 dark:border-[#2E2E38] text-slate-600 dark:text-[#C9C9D2] hover:text-slate-900 dark:hover:text-[#F1F1F4] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            title="Mover"
          >
            <FolderInput size={14} />
            <span>Mover</span>
          </button>

          {/* 6. Partilhar */}
          <button
            type="button"
            className="h-[34px] px-3 rounded-md bg-white dark:bg-[#1A1A21] hover:bg-slate-50 dark:hover:bg-[#24242C] border border-slate-200 dark:border-[#2E2E38] text-slate-600 dark:text-[#C9C9D2] hover:text-slate-900 dark:hover:text-[#F1F1F4] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            title="Partilhar"
          >
            <ExternalLink size={14} />
            <span>Partilhar</span>
          </button>

          {/* 7. Lixeira */}
          <button
            type="button"
            onClick={onDeleteSelected}
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#1A1A21] hover:bg-red-50 dark:hover:bg-[#2A1615] hover:text-red-600 dark:hover:text-[#FF9A92] border border-slate-200 dark:border-[#2E2E38] hover:border-red-200 dark:hover:border-[#542825] text-slate-500 dark:text-[#90909D] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>

          {/* 8. Mais Opções */}
          <button
            type="button"
            onClick={onOpenMoreOptions}
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#1A1A21] hover:bg-slate-50 dark:hover:bg-[#24242C] border border-slate-200 dark:border-[#2E2E38] text-slate-500 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-[#F1F1F4] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
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
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#1A1A21] border border-slate-200 dark:border-[#2E2E38] text-slate-500 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-[#F1F1F4] hover:bg-slate-50 dark:hover:bg-[#24242C] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Filtrar por Tags"
          >
            <Tag size={14} />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            className="h-[34px] w-[34px] rounded-md bg-white dark:bg-[#1A1A21] hover:bg-slate-50 dark:hover:bg-[#24242C] border border-slate-200 dark:border-[#2E2E38] text-slate-500 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-[#F1F1F4] flex items-center justify-center transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
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
