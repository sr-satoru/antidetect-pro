import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Trash2, Tag as TagIcon, Pencil, Check } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Salvar nova tag ou edição
  const handleSaveTag = async (data: { id?: string; name: string; color: string }) => {
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
    } catch (err: any) {
      alert(`Erro ao excluir etiquetas: ${err.message || 'Falha na exclusão'}`);
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
    } catch (err: any) {
      alert(`Erro ao excluir etiqueta: ${err.message || 'Falha na exclusão'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-[680px] rounded-xl border border-[#303241] bg-[#1E2028] shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2E3B] px-5 py-3.5 shrink-0">
          <h2 className="text-[16px] font-semibold text-[#E1E4EE]">Etiqueta</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#8E92A2] hover:bg-[#2A2C38] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar de Ações */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[#2C2E3B] shrink-0">
          <div className="flex items-center gap-3 flex-1">
            {/* Botão Nova Etiqueta */}
            <button
              type="button"
              onClick={() => {
                setTagEmEdicao(null);
                setIsSubmodalOpen(true);
              }}
              className="flex h-8.5 cursor-pointer items-center gap-2 rounded-md bg-[#1677FF] px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#0E63D8] active:scale-[0.98] shrink-0"
            >
              <TagIcon size={13} />
              <span>Nova Etiqueta</span>
            </button>

            {/* Input de Busca */}
            <div className="relative w-64 max-w-full">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7082]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="h-8.5 w-full rounded-md border border-[#303241] bg-[#14151B] pl-8 pr-3 text-xs text-[#E1E4EE] placeholder-[#585B6A] focus:border-[#1677FF] focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          {/* Botão de Excluir em Massa */}
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-md border border-[#303241] bg-[#14151B] text-[#8E92A2] transition-colors hover:border-[#FF4D4F] hover:text-[#FF4D4F] disabled:opacity-40 disabled:pointer-events-none"
            title="Excluir selecionados"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Tabela de Etiquetas */}
        <div className="flex-1 overflow-y-auto">
          {/* Cabeçalho da Tabela */}
          <div className="flex items-center border-b border-[#2C2E3B] bg-[#17181F] px-4 py-2.5 text-xs font-medium text-[#8E92A2] select-none sticky top-0 z-10">
            <div className="w-8 flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="h-3.5 w-3.5 rounded border-[#3A3D4D] bg-[#14151B] text-[#1677FF] focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="flex-1">Etiqueta</div>
            <div className="w-24 text-right pr-2">Ações</div>
          </div>

          {/* Linhas ou Estado Vazio */}
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#6C7082] select-none">
              <p className="text-xs">
                {isLoading ? 'Carregando etiquetas...' : 'Sem dados'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2C2E3B]/60">
              {filteredTags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                const isFilteringThis = selectedTagFilter === tag.name;

                return (
                  <div
                    key={tag.id}
                    className={`flex items-center px-4 py-2.5 text-xs transition-colors group ${
                      isSelected
                        ? 'bg-[#1677FF]/10'
                        : isFilteringThis
                        ? 'bg-[#2A2D3C]'
                        : 'hover:bg-[#252733]'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-8 flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(tag.id)}
                        className="h-3.5 w-3.5 rounded border-[#3A3D4D] bg-[#14151B] text-[#1677FF] focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* Badge / Nome */}
                    <div
                      className="flex-1 flex items-center gap-2 cursor-pointer"
                      onClick={() => {
                        if (onSelectTagFilter) {
                          onSelectTagFilter(isFilteringThis ? null : tag.name);
                        }
                      }}
                      title="Clique para filtrar a tabela por esta etiqueta"
                    >
                      <TagBadge name={tag.name} color={tag.color} />
                      {isFilteringThis && (
                        <span className="flex items-center gap-1 rounded bg-[#1677FF]/20 px-1.5 py-0.2 text-[10px] text-[#64B5F6] font-semibold">
                          <Check size={10} /> Filtro Ativo
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="w-24 flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setTagEmEdicao(tag);
                          setIsSubmodalOpen(true);
                        }}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#8E92A2] hover:bg-[#303342] hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(tag)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#8E92A2] hover:bg-[#FF4D4F]/15 hover:text-[#FF4D4F] transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
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
