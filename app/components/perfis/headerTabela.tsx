import React from 'react';
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Play,
  CircleX,
  Bot,
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
  onStartSelected?: () => void;
  onStopSelected?: () => void;
  onDeleteSelected?: () => void;
  onRefresh?: () => void;
  onOpenTagFilter?: () => void;
  onOpenMoreOptions?: () => void;
  [key: string]: any;
}

export const HeaderTabela: React.FC<HeaderTabelaProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedGroup = 'Todos os grupos',
  onGroupChange,
  onStartSelected,
  onStopSelected,
  onDeleteSelected,
  onRefresh,
  onOpenTagFilter,
  onOpenMoreOptions,
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
            className="h-9 pl-3.5 pr-8 rounded-md bg-[#14151B] border border-[#2C2E38] hover:border-[#3E4150] text-[13px] text-[#A9ACB9] appearance-none cursor-pointer focus:outline-hidden transition-colors"
          >
            <option value="Todos os grupos">Todos os grupos</option>
            <option value="Desagrupado">Desagrupado</option>
            <option value="Tráfego Pago">Tráfego Pago</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6C6F7E] pointer-events-none"
          />
        </div>

        {/* 2. Campo de Pesquisa com SlidersHorizontal integrado */}
        <div className="relative w-96 sm:w-[460px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6C6F7E]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Pesquisa ou novos critérios de pesquisa"
            className="w-full h-9 bg-[#14151B] border border-[#2C2E38] focus:border-[#3E4150] text-[#E1E4EE] text-[13px] pl-9 pr-8 rounded-md placeholder-[#585B6A] focus:outline-hidden transition-colors"
          />
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6C6F7E] hover:text-white transition-colors cursor-pointer"
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
            className="h-[34px] px-3.5 rounded-md bg-[#0D4FE0] hover:bg-[#0B44C4] text-white text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            title="Abrir"
          >
            <Play size={12} fill="currentColor" />
            <span>Abrir</span>
          </button>

          {/* 2. RPA Plus */}
          <button
            type="button"
            className="h-[34px] px-3 rounded-md bg-[#14151B] hover:bg-[#1A1C24] border border-[#262732] text-[#8E92A2] hover:text-[#E1E4EE] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
            title="RPA Plus"
          >
            <Bot size={14} />
            <span>RPA Plus</span>
          </button>

          {/* 3. Fechar */}
          <button
            type="button"
            onClick={onStopSelected}
            className="h-[34px] px-3 rounded-md bg-[#14151B] hover:bg-[#1A1C24] border border-[#262732] text-[#8E92A2] hover:text-[#E1E4EE] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
            title="Fechar"
          >
            <CircleX size={14} />
            <span>Fechar</span>
          </button>

          {/* 4. Exportar */}
          <button
            type="button"
            className="h-[34px] px-3 rounded-md bg-[#14151B] hover:bg-[#1A1C24] border border-[#262732] text-[#8E92A2] hover:text-[#E1E4EE] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
            title="Exportar"
          >
            <Upload size={14} />
            <span>Exportar</span>
          </button>

          {/* 5. Mover */}
          <button
            type="button"
            className="h-[34px] px-3 rounded-md bg-[#14151B] hover:bg-[#1A1C24] border border-[#262732] text-[#8E92A2] hover:text-[#E1E4EE] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
            title="Mover"
          >
            <FolderInput size={14} />
            <span>Mover</span>
          </button>

          {/* 6. Partilhar */}
          <button
            type="button"
            className="h-[34px] px-3 rounded-md bg-[#14151B] hover:bg-[#1A1C24] border border-[#262732] text-[#8E92A2] hover:text-[#E1E4EE] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
            title="Partilhar"
          >
            <ExternalLink size={14} />
            <span>Partilhar</span>
          </button>

          {/* 7. Lixeira */}
          <button
            type="button"
            onClick={onDeleteSelected}
            className="h-[34px] w-[34px] rounded-md bg-[#14151B] hover:bg-[#1A1C24] hover:text-[#f87171] border border-[#262732] text-[#8E92A2] flex items-center justify-center transition-colors cursor-pointer"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>

          {/* 8. Mais Opções */}
          <button
            type="button"
            onClick={onOpenMoreOptions}
            className="h-[34px] w-[34px] rounded-md bg-[#14151B] hover:bg-[#1A1C24] border border-[#262732] text-[#8E92A2] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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
            className="h-[34px] w-[34px] rounded-md bg-[#14151B] border border-[#262732] text-[#8E92A2] hover:text-[#E1E4EE] hover:bg-[#1A1C24] flex items-center justify-center transition-colors cursor-pointer"
            title="Filtrar por Tags"
          >
            <Tag size={14} />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="h-[34px] w-[34px] rounded-md bg-[#14151B] hover:bg-[#1A1C24] border border-[#262732] text-[#8E92A2] hover:text-[#E1E4EE] flex items-center justify-center transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderTabela;
