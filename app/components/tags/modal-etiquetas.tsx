import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Trash2,
  Tag as TagIcon,
  Pencil,
  Check,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { TagItem, serviceTags } from '../../services/tags/service.tags';
import { ModalNovaEtiqueta } from './modal-nova-etiqueta';
import { TagBadge } from './tag-badge';
import { Checkbox } from '../ui/checkbox';

interface ModalEtiquetasProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTagFilter?: string | null;
  onSelectTagFilter?: (tagName: string | null) => void;
  onTagsUpdated?: () => void;
}

const PAGE_SIZE = 10;

export const ModalEtiquetas: React.FC<ModalEtiquetasProps> = ({
  isOpen,
  onClose,
  selectedTagFilter,
  onSelectTagFilter,
  onTagsUpdated,
}) => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null);

  // Submodal para criar/editar
  const [isSubmodalOpen, setIsSubmodalOpen] = useState(false);
  const [tagEmEdicao, setTagEmEdicao] = useState<TagItem | null>(null);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const res = await serviceTags.list();
      setTags(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Erro ao buscar etiquetas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      setSelectedIds([]);
      setSearchQuery('');
      setCurrentPage(1);
      setMenuOpenId(null);
    }
  }, [isOpen]);

  // Fechar dropdown de menu ao clicar fora
  useEffect(() => {
    if (!menuOpenId) return;
    const handleGlobalClick = () => setMenuOpenId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [menuOpenId]);

  // Tecla Escape para fechar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpenId) {
          setMenuOpenId(null);
        } else if (!isSubmodalOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, menuOpenId, isSubmodalOpen, onClose]);

  // Filtragem da lista pela busca
  const filteredTags = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredTags.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedTags = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTags.slice(start, start + PAGE_SIZE);
  }, [filteredTags, currentPage]);

  // Selecionar todos da página atual
  const isAllSelected =
    paginatedTags.length > 0 &&
    paginatedTags.every((t) => selectedIds.includes(t.id));
  const isSomeSelected =
    paginatedTags.length > 0 &&
    !isAllSelected &&
    paginatedTags.some((t) => selectedIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = paginatedTags.map((t) => t.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedTags.map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectOne = (id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Salvar nova tag ou edição
  const handleSaveTag = async (data: { id?: string | number; name: string; color: string }) => {
    if (data.id) {
      await serviceTags.update(data.id, { name: data.name, color: data.color });
    } else {
      await serviceTags.create({ name: data.name, color: data.color });
    }
    await fetchTags();
    onTagsUpdated?.();
  };

  // Excluir tags selecionadas
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Tem certeza que deseja excluir ${selectedIds.length} etiqueta(s)?`,
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await serviceTags.deleteMany(selectedIds);
      setSelectedIds([]);
      await fetchTags();
      onTagsUpdated?.();
      toast.success('Etiquetas excluídas com sucesso');
    } catch (err: any) {
      toast.error(`Erro ao excluir etiquetas: ${err.message || 'Falha na exclusão'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Excluir tag individual
  const handleDeleteSingle = async (tag: TagItem) => {
    if (!confirm(`Excluir a etiqueta "${tag.name}"?`)) return;
    try {
      setIsLoading(true);
      await serviceTags.delete(tag.id);
      setSelectedIds((prev) => prev.filter((id) => id !== tag.id));
      await fetchTags();
      onTagsUpdated?.();
      toast.success('Etiqueta excluída');
    } catch (err: any) {
      toast.error(`Erro ao excluir etiqueta: ${err.message || 'Falha na exclusão'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[7vh] sm:pt-[9vh] bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[820px] h-[640px] max-h-[85vh] rounded-2xl border border-slate-200 dark:border-[#303241]/90 bg-white dark:bg-[#1E1F24] shadow-2xl dark:shadow-black/95 overflow-hidden flex flex-col mb-12 animate-in zoom-in-95 duration-150 select-none text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Clean estilo AdsPower */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 shrink-0">
          <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white tracking-tight">
            Etiqueta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#8E92A2] dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar de Ações */}
        <div className="flex items-center justify-between gap-3 px-7 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            {/* Botão Nova Etiqueta */}
            <button
              type="button"
              onClick={() => {
                setTagEmEdicao(null);
                setIsSubmodalOpen(true);
              }}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] text-white px-4 text-xs font-semibold shadow-xs hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98]"
            >
              <TagIcon size={14} className="stroke-[2.5]" />
              <span>Nova Etiqueta</span>
            </button>

            {/* Input de Busca */}
            <div className="relative w-64">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#6C7082] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search"
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-[#303241] bg-white dark:bg-[#15161C] pl-9 pr-3 text-xs text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#585B6A] focus:border-blue-500 dark:focus:border-[#1677FF] focus:ring-1 focus:ring-blue-500/20 focus:outline-hidden transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Botão de Excluir à direita estilo AdsPower */}
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || isLoading}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
              selectedIds.length > 0
                ? 'border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:border-red-500 cursor-pointer shadow-xs'
                : 'border-slate-200 dark:border-[#303241] text-slate-400 dark:text-[#585B6A] cursor-not-allowed opacity-50'
            }`}
            title={
              selectedIds.length > 0
                ? `Excluir ${selectedIds.length} etiqueta(s)`
                : 'Selecione etiquetas para excluir'
            }
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Cabeçalho da Tabela */}
        <div className="flex items-center px-4 py-2.5 mx-7 mt-2 mb-1 rounded-lg bg-slate-100/80 dark:bg-[#15161C] text-xs font-medium text-slate-600 dark:text-[#8E92A2] select-none shrink-0">
          <div className="w-8 flex items-center">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={handleToggleSelectAll}
              aria-label="Selecionar todas as etiquetas"
            />
          </div>
          <div className="flex-1 text-xs font-normal text-slate-600 dark:text-[#A6ABB9]">
            Etiqueta
          </div>
        </div>

        {/* Tabela de Etiquetas */}
        <div className="flex-1 overflow-y-auto px-7 py-1">
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-slate-400 dark:text-[#6C7082] select-none">
              <TagIcon size={30} className="text-slate-300 dark:text-[#363847] mb-2" />
              <p className="text-xs">
                {isLoading ? 'Carregando etiquetas...' : 'Nenhuma etiqueta encontrada'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {paginatedTags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                const isFilteringThis = selectedTagFilter === tag.name;

                return (
                  <div
                    key={tag.id}
                    className={`flex items-center px-4 py-3 text-xs rounded-lg transition-colors group relative ${
                      isSelected
                        ? 'bg-blue-500/5 dark:bg-[#1677FF]/8'
                        : isFilteringThis
                        ? 'bg-slate-100/70 dark:bg-[#1D2436]'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className="w-8 flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(tag.id)}
                        aria-label={`Selecionar etiqueta ${tag.name}`}
                      />
                    </div>

                    {/* Tag Badge + Botão `···` */}
                    <div className="flex-1 flex items-center gap-2 relative">
                      <div
                        onClick={() => {
                          if (onSelectTagFilter) {
                            onSelectTagFilter(isFilteringThis ? null : tag.name);
                          }
                        }}
                        className="cursor-pointer"
                        title="Clique para filtrar a lista por esta etiqueta"
                      >
                        <TagBadge name={tag.name} color={tag.color} />
                      </div>

                      {/* Botão `···` e Menu de Ações */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === tag.id ? null : tag.id);
                          }}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-[#8E92A2] dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                          title="Mais opções"
                        >
                          <MoreHorizontal size={14} />
                        </button>

                        {menuOpenId === tag.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="animate-in fade-in zoom-in-95 absolute left-full top-0 ml-1 z-30 w-28 rounded-lg border border-slate-200 dark:border-[#303241] bg-white dark:bg-[#1A1C24] p-1 shadow-xl text-xs select-none"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                setTagEmEdicao(tag);
                                setIsSubmodalOpen(true);
                              }}
                              className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-[#D1D5DB] dark:hover:bg-white/5 transition-colors"
                            >
                              <Pencil size={12} />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                handleDeleteSingle(tag);
                              }}
                              className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-red-500 hover:bg-red-50 dark:text-[#FF4D4F] dark:hover:bg-[#FF4D4F]/10 transition-colors"
                            >
                              <Trash2 size={12} />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Badge de filtro ativo se aplicável */}
                      {isFilteringThis && (
                        <span className="flex items-center gap-1 rounded-md bg-violet-500/15 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] text-[#7C3AED] dark:text-[#A78BFA] font-medium border border-violet-500/25 dark:border-violet-500/30 ml-2">
                          <Check size={10} /> Filtro Ativo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com Paginação estilo AdsPower (Total: X  < [1] / Y >) */}
        <div className="flex items-center justify-end gap-3 px-7 py-3.5 border-t border-slate-100 dark:border-[#282A35] text-xs text-slate-500 dark:text-[#8E92A2] select-none shrink-0 bg-white dark:bg-[#1E1F24]">
          <span>Total: {filteredTags.length}</span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="flex h-7 w-7 items-center justify-center rounded border border-transparent hover:border-slate-200 dark:hover:border-[#303241] hover:bg-slate-100 dark:hover:bg-[#252834] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-slate-500 dark:text-[#A6ABB9]"
            title="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex h-7 min-w-[32px] px-2 items-center justify-center rounded border border-slate-200 dark:border-[#303241] bg-slate-50 dark:bg-[#15161C] text-xs font-mono font-medium text-slate-900 dark:text-white shadow-2xs">
            {currentPage}
          </div>

          <span>/ {totalPages}</span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="flex h-7 w-7 items-center justify-center rounded border border-transparent hover:border-slate-200 dark:hover:border-[#303241] hover:bg-slate-100 dark:hover:bg-[#252834] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-slate-500 dark:text-[#A6ABB9]"
            title="Próxima página"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Submodal Nova/Editar Etiqueta */}
      <ModalNovaEtiqueta
        isOpen={isSubmodalOpen}
        onClose={() => {
          setIsSubmodalOpen(false);
          setTagEmEdicao(null);
        }}
        onSave={handleSaveTag}
        tagParaEditar={tagEmEdicao}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ModalEtiquetas;
