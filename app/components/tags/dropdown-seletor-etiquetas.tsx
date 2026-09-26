import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, CornerDownLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TAG_COLORS, DEFAULT_TAG_COLOR, getTagColorStyle } from './tag-palette';
import { serviceTags, TagItem } from '../../services/tags/service.tags';

interface DropdownSeletorEtiquetasProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onToggleTag: (tagName: string) => void;
  onAddNewTag?: (tagName: string, color: string) => Promise<void>;
}

export const DropdownSeletorEtiquetas: React.FC<DropdownSeletorEtiquetasProps> = ({
  isOpen,
  onClose,
  selectedTags,
  onToggleTag,
  onAddNewTag,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Carrega etiquetas do backend sempre que abrir
  useEffect(() => {
    if (isOpen) {
      serviceTags.list().then((list) => {
        setAvailableTags(Array.isArray(list) ? list : []);
      }).catch(console.error);

      setSearchTerm('');
      setShowColorPicker(false);
      setNewTagColor(DEFAULT_TAG_COLOR);

      // Foca automaticamente no input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showColorPicker) {
          setShowColorPicker(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, showColorPicker]);

  // Filtragem das tags disponíveis
  const filteredTags = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return availableTags;
    return availableTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTags, searchTerm]);

  // Handler para criar nova tag livremente
  const handleCreateNewTag = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed || isCreating) return;

    try {
      setIsCreating(true);

      if (onAddNewTag) {
        await onAddNewTag(trimmed, newTagColor);
        onToggleTag(trimmed);
      } else {
        const createdTag = await serviceTags.create({
          name: trimmed,
          color: newTagColor,
        });
        setAvailableTags((prev) => [...prev, createdTag]);
        onToggleTag(createdTag.name);
      }

      setSearchTerm('');
      setShowColorPicker(false);
      toast.success('Etiqueta criada com sucesso');
    } catch (err: any) {
      toast.error(`Erro ao criar etiqueta: ${err.message || 'Falha ao salvar'}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const currentBadgeStyle = getTagColorStyle(newTagColor);

  return (
    <div
      ref={containerRef}
      className="animate-in fade-in zoom-in-95 absolute right-0 top-full z-50 mt-1.5 w-[330px] rounded-lg border border-[#303241] bg-[#1E2028] shadow-2xl shadow-black/80 select-none overflow-hidden duration-100"
    >
      {/* 1. Barra de Busca / Criação */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#2C2E3B]">
        <Search size={15} className="text-[#1677FF] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (showColorPicker) setShowColorPicker(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateNewTag();
            }
          }}
          placeholder="Encontrar uma etiqueta / Criar uma etiqueta"
          className="w-full bg-transparent text-xs text-[#E1E4EE] placeholder-[#6C7082] focus:outline-hidden"
        />
      </div>

      {/* 2. Opção "Criar [nome ⌄] ↵" se digitou texto */}
      {searchTerm.trim().length > 0 && (
        <div
          onClick={() => handleCreateNewTag()}
          className="relative border-b border-[#2C2E3B] px-3 py-2 bg-[#17181F]/50 cursor-pointer hover:bg-[#252733] transition-colors"
        >
          {/* Seletor flutuante de cor (estilo popover com triângulo na imagem 3) */}
          {showColorPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="animate-in fade-in zoom-in-95 absolute bottom-full left-4 mb-2 z-60 rounded-md border border-[#383A49] bg-[#14151B] p-2 shadow-xl shadow-black/90 duration-100"
            >
              <div className="flex items-center gap-2">
                {TAG_COLORS.map((c) => {
                  const isSel = c.hex.toLowerCase() === newTagColor.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewTagColor(c.hex);
                        setShowColorPicker(false);
                      }}
                      style={{ backgroundColor: c.hex }}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 shadow-sm"
                      title={c.name}
                    >
                      {isSel && <Check size={11} className="text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
              {/* Setinha apontando para baixo */}
              <div className="absolute -bottom-1.5 left-10 h-3 w-3 rotate-45 border-b border-r border-[#383A49] bg-[#14151B]" />
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8E92A2]">Criar</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorPicker(!showColorPicker);
                }}
                style={{
                  backgroundColor: currentBadgeStyle.backgroundColor,
                  borderColor: currentBadgeStyle.borderColor,
                  color: currentBadgeStyle.color,
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all hover:brightness-110 active:scale-98"
                title="Clique para escolher a cor da etiqueta"
              >
                <span className="truncate max-w-[150px]">{searchTerm.trim()}</span>
                {showColorPicker ? (
                  <ChevronUp size={12} className="opacity-70" />
                ) : (
                  <ChevronDown size={12} className="opacity-70" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNewTag();
              }}
              disabled={isCreating}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[#8E92A2] hover:bg-[#2C2E3B] hover:text-white transition-colors"
              title="Pressione Enter ou clique para criar"
            >
              <CornerDownLeft size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Lista de Etiquetas Existentes */}
      <div className="max-h-56 overflow-y-auto divide-y divide-[#2C2E3B]/40">
        {filteredTags.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#6C7082] select-none">
            Sem dados
          </div>
        ) : (
          filteredTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.name);
            const style = getTagColorStyle(tag.color);

            return (
              <div
                key={tag.id}
                onClick={() => onToggleTag(tag.name)}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[#252733] ${
                  isSelected ? 'bg-[#1677FF]/8' : ''
                }`}
              >
                {/* Badge da Etiqueta com sua cor */}
                <span
                  style={{
                    backgroundColor: style.backgroundColor,
                    borderColor: style.borderColor,
                    color: style.color,
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: style.color }}
                  />
                  <span className="truncate max-w-[190px]">{tag.name}</span>
                </span>

                {/* Checkmark no lado direito se selecionado */}
                {isSelected && (
                  <Check size={14} className="text-[#8E92A2]" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DropdownSeletorEtiquetas;
