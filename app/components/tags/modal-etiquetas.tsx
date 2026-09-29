import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Trash2, Tag as TagIcon, Pencil, Check } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { TagItem, serviceTags } from '../../services/tags/service.tags';
import { ModalNovaEtiqueta } from './modal-nova-etiqueta';
import { TagBadge } from './tag-badge';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[680px] rounded-2xl border border-[#303241]/90 bg-[#1A1C24] shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2E3B]/80 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DFE104]/15 text-[#DFE104]">
              <TagIcon size={15} />
            </div>
            <h2 className="text-[16px] font-semibold text-[#E1E4EE] tracking-tight">Gerenciar Etiquetas</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#8E92A2] hover:bg-[#2A2C38] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar de Ações */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#2C2E3B]/70 bg-[#16171E]/60 shrink-0">
          <div className="flex items-center gap-3 w-full">
            {/* Botão Nova Etiqueta */}
            <button
              type="button"
              onClick={() => {
                setTagEmEdicao(null);
                setIsSubmodalOpen(true);
              }}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#1C1D24] border border-white/30 hover:border-white px-4 text-xs font-medium text-white shadow-md transition-all hover:bg-[#252834] active:scale-[0.98] shrink-0"
            >
              <TagIcon size={13} className="text-white/90" />
              <span>Nova Etiqueta</span>
            </button>

            {/* Input de Busca */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6C7082] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar etiqueta..."
                className="h-9 w-full rounded-lg border border-[#303241]/80 bg-[#14151B] pl-9 pr-3 text-xs text-[#E1E4EE] placeholder-[#585B6A] focus:border-[#1677FF] focus:ring-1 focus:ring-[#1677FF]/40 focus:outline-hidden transition-all"
              />
            </div>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex h-9 items-center gap-1.5 px-3 rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 text-xs font-medium text-[#FF4D4F] hover:bg-[#FF4D4F]/20 transition-all cursor-pointer ml-auto"
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
          <div className="flex items-center border-b border-[#2C2E3B]/70 bg-[#171821]/80 px-6 py-2.5 text-xs font-semibold text-[#8E92A2] select-none sticky top-0 z-10 backdrop-blur-xs">
            <div className="w-9 flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 rounded border-[#3A3D4D] bg-[#14151B] text-[#1677FF] focus:ring-0 cursor-pointer accent-[#1677FF]"
              />
            </div>
            <div className="flex-1 tracking-wider uppercase text-[11px] text-[#717585]">Etiqueta</div>
            <div className="w-24 text-right pr-2 tracking-wider uppercase text-[11px] text-[#717585]">Ações</div>
          </div>

          {/* Linhas ou Estado Vazio */}
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#6C7082] select-none">
              <TagIcon size={28} className="text-[#363847] mb-2" />
              <p className="text-xs">
                {isLoading ? 'Carregando etiquetas...' : 'Nenhuma etiqueta encontrada'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2C2E3B]/40">
              {filteredTags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                const isFilteringThis = selectedTagFilter === tag.name;

                return (
                  <div
                    key={tag.id}
                    className={`flex items-center px-6 py-3 text-xs transition-colors group ${
                      isSelected
                        ? 'bg-[#1677FF]/10'
                        : isFilteringThis
                        ? 'bg-[#1D2436]'
                        : 'hover:bg-[#232532]/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-9 flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(tag.id)}
                        className="h-4 w-4 rounded border-[#3A3D4D] bg-[#14151B] text-[#1677FF] focus:ring-0 cursor-pointer accent-[#1677FF]"
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
                        <span className="flex items-center gap-1 rounded-md bg-[#1677FF]/20 px-2 py-0.5 text-[10px] text-[#64B5F6] font-medium border border-[#1677FF]/30">
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
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#8E92A2] hover:bg-[#2C2E3B] hover:text-[#1677FF] transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(tag)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#8E92A2] hover:bg-[#FF4D4F]/15 hover:text-[#FF4D4F] transition-colors"
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
