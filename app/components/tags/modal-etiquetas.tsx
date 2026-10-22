import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Trash2, Tag as TagIcon, Pencil, Check } from 'lucide-react';
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
    }
  }, [isOpen]);

  // Filtragem da lista pela busca
  const filteredTags = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  // Selecionar todos
  const isAllSelected =
    filteredTags.length > 0 &&
    filteredTags.every((t) => selectedIds.includes(t.id));
  const isSomeSelected =
    filteredTags.length > 0 &&
    !isAllSelected &&
    filteredTags.some((t) => selectedIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTags.map((t) => t.id));
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[9vh] sm:pt-[11vh] bg-slate-900/40 dark:bg-black/70 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-[760px] rounded-2xl border border-slate-200 dark:border-[#303241]/90 bg-white dark:bg-[#1A1C24] shadow-2xl shadow-slate-900/15 dark:shadow-black/90 overflow-hidden flex flex-col max-h-[82vh] mb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2C2E3B]/80 px-7 py-4.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-[#00FF66]/15 text-emerald-600 dark:text-[#00FF66]">
              <TagIcon size={15} />
            </div>
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-[#E1E4EE] tracking-tight">Gerenciar Etiquetas</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:bg-[#2A2C38] dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar de Ações */}
        <div className="flex items-center justify-between gap-3 px-7 py-4 border-b border-slate-200 dark:border-[#2C2E3B]/70 bg-slate-50/70 dark:bg-[#16171E]/60 shrink-0">
          <div className="flex items-center gap-3 w-full">
            {/* Botão Nova Etiqueta */}
            <button
              type="button"
              onClick={() => {
                setTagEmEdicao(null);
                setIsSubmodalOpen(true);
              }}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-[#1C1D24] dark:border dark:border-white/30 dark:hover:border-white dark:text-white px-4 text-xs font-medium shadow-xs dark:shadow-md transition-all dark:hover:bg-[#252834] active:scale-[0.98] shrink-0"
            >
              <TagIcon size={13} className="text-white/90" />
              <span>Nova Etiqueta</span>
            </button>

            {/* Input de Busca */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#6C7082] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar etiqueta..."
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-[#303241]/80 bg-white dark:bg-[#14151C] pl-9 pr-3 text-xs text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#585B6A] focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/15 dark:focus:ring-white/15 focus:outline-hidden transition-all shadow-2xs"
              />
            </div>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex h-9 items-center gap-1.5 px-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-medium text-red-600 dark:text-[#FF4D4F] hover:bg-red-500/20 transition-all cursor-pointer ml-auto"
              >
                <Trash2 size={13} />
                <span>Excluir ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Etiquetas */}
        <div className="flex-1 overflow-y-auto">
          {/* Cabeçalho da Tabela */}
          <div className="flex items-center border-b border-slate-200 dark:border-[#2C2E3B] bg-slate-100 dark:bg-[#171821] px-6 py-2.5 text-xs font-semibold text-slate-600 dark:text-[#8E92A2] select-none sticky top-0 z-10">
            <div className="w-9 flex items-center justify-center">
              <Checkbox
                checked={isAllSelected}
                indeterminate={isSomeSelected}
                onChange={handleToggleSelectAll}
                aria-label="Selecionar todas as etiquetas"
              />
            </div>
            <div className="flex-1 tracking-wider uppercase text-[11px] text-slate-500 dark:text-[#717585]">Etiqueta</div>
            <div className="w-24 text-right pr-2 tracking-wider uppercase text-[11px] text-slate-500 dark:text-[#717585]">Ações</div>
          </div>

          {/* Linhas ou Estado Vazio */}
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-[#6C7082] select-none">
              <TagIcon size={28} className="text-slate-300 dark:text-[#363847] mb-2" />
              <p className="text-xs">
                {isLoading ? 'Carregando etiquetas...' : 'Nenhuma etiqueta encontrada'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2C2E3B]/40">
              {filteredTags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                const isFilteringThis = selectedTagFilter === tag.name;

                return (
                  <div
                    key={tag.id}
                    className={`flex items-center px-6 py-3 text-xs transition-colors group ${
                      isSelected
                        ? 'bg-blue-500/10 dark:bg-[#1677FF]/10'
                        : isFilteringThis
                        ? 'bg-slate-100 dark:bg-[#1D2436]'
                        : 'hover:bg-slate-50 dark:hover:bg-[#232532]/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-9 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(tag.id)}
                        aria-label={`Selecionar etiqueta ${tag.name}`}
                      />
                    </div>

                    {/* Badge / Nome */}
                    <div
                      className="flex-1 flex items-center gap-2.5 cursor-pointer"
                      onClick={() => {
                        if (onSelectTagFilter) {
                          onSelectTagFilter(isFilteringThis ? null : tag.name);
                        }
                      }}
                      title="Clique para filtrar a tabela por esta etiqueta"
                    >
                      <TagBadge name={tag.name} color={tag.color} />
                      {isFilteringThis && (
                        <span className="flex items-center gap-1 rounded-md bg-blue-500/15 dark:bg-[#1677FF]/20 px-2 py-0.5 text-[10px] text-blue-600 dark:text-[#64B5F6] font-medium border border-blue-500/25 dark:border-[#1677FF]/30">
                          <Check size={10} /> Filtro Ativo
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="w-24 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setTagEmEdicao(tag);
                          setIsSubmodalOpen(true);
                        }}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:text-[#8E92A2] dark:hover:bg-[#2C2E3B] dark:hover:text-[#1677FF] transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(tag)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 dark:text-[#8E92A2] dark:hover:bg-[#FF4D4F]/15 dark:hover:text-[#FF4D4F] transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
