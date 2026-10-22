import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, CornerDownLeft, Check } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from './tag-palette';
import { TagBadge } from './tag-badge';
import { serviceTags, TagItem } from '../../services/tags/service.tags';

interface DropdownSeletorEtiquetasProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onToggleTag: (tagName: string) => void;
  onAddNewTag?: (tagName: string, color: string) => Promise<void>;
  className?: string;
  fullWidth?: boolean;
}

export const DropdownSeletorEtiquetas: React.FC<DropdownSeletorEtiquetasProps> = ({
  isOpen,
  onClose,
  selectedTags,
  onToggleTag,
  onAddNewTag,
  className = '',
  fullWidth = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Carrega etiquetas do backend sempre que abrir
  const loadTags = async (query?: string) => {
    try {
      setIsLoading(true);
      const list = await serviceTags.list(query);
      setAvailableTags(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erro ao listar tags no dropdown:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTags();
      setSearchTerm('');
      setShowColorPicker(false);
      setNewTagColor(DEFAULT_TAG_COLOR);

      // Foca automaticamente no input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounce para busca remota no backend ao digitar
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadTags(searchTerm.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

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

  // Verifica se já existe uma tag exatamente igual à digitada
  const exactMatch = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return null;
    return availableTags.find((t) => t.name.toLowerCase() === q);
  }, [availableTags, searchTerm]);

  // Handler para criar nova tag ou selecionar se já existir
  const handleCreateNewTag = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed || isCreating) return;

    // Se já existe uma tag com este nome, apenas seleciona
    if (exactMatch) {
      if (!selectedTags.includes(exactMatch.name)) {
        onToggleTag(exactMatch.name);
      }
      setSearchTerm('');
      setShowColorPicker(false);
      return;
    }

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
        setAvailableTags((prev) => {
          const exists = prev.some((t) => t.id === createdTag.id || t.name.toLowerCase() === createdTag.name.toLowerCase());
          return exists ? prev : [...prev, createdTag];
        });
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

  return (
    <div
      ref={containerRef}
      className={`animate-in fade-in zoom-in-95 absolute top-full z-50 mt-1.5 rounded-lg border border-slate-200 dark:border-[#2D3039] bg-white dark:bg-[#1E2028] shadow-xl shadow-slate-900/10 dark:shadow-2xl dark:shadow-black/80 select-none overflow-hidden duration-100 ${
        fullWidth ? 'left-0 right-0 w-full' : 'right-0 w-[330px]'
      } ${className}`}
    >
      {/* 1. Barra de Busca / Criação */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 dark:border-[#2D3039]">
        <Search size={15} className="text-slate-400 dark:text-[#9DA2B4] shrink-0" />
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
          className="w-full bg-transparent text-xs text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#6C7082] focus:outline-hidden"
        />
      </div>

      {/* 2. Opção "Criar [nome ⌄] ↵" se digitou texto */}
      {searchTerm.trim().length > 0 && (
        <div
          onClick={() => handleCreateNewTag()}
          className="relative border-b border-slate-100 dark:border-[#2D3039] px-3 py-2 bg-slate-50 dark:bg-[#17181F]/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#252733] transition-colors"
        >
          {/* Seletor flutuante de cor */}
          {showColorPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="animate-in fade-in zoom-in-95 absolute bottom-full left-4 mb-2 z-60 rounded-md border border-slate-200 dark:border-[#383A49] bg-white dark:bg-[#141519] p-2 shadow-xl shadow-slate-900/15 dark:shadow-black/90 duration-100"
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
              <div className="absolute -bottom-1.5 left-10 h-3 w-3 rotate-45 border-b border-r border-slate-200 dark:border-[#383A49] bg-white dark:bg-[#141519]" />
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-[#9DA2B4]">{exactMatch ? 'Selecionar' : 'Criar'}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!exactMatch) setShowColorPicker(!showColorPicker);
                }}
                className="inline-flex items-center gap-1.5 cursor-pointer select-none"
                title={exactMatch ? 'Etiqueta já existente' : 'Clique para escolher a cor da etiqueta'}
              >
                <TagBadge
                  name={searchTerm.trim()}
                  color={exactMatch ? exactMatch.color : newTagColor}
                  className="max-w-[150px]"
                />
                {!exactMatch && (
                  showColorPicker ? (
                    <ChevronUp size={12} className="opacity-70 text-slate-400" />
                  ) : (
                    <ChevronDown size={12} className="opacity-70 text-slate-400" />
                  )
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
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-800 dark:text-[#9DA2B4] dark:hover:bg-[#2C2E3B] dark:hover:text-white transition-colors"
              title={exactMatch ? 'Pressione Enter para selecionar' : 'Pressione Enter ou clique para criar'}
            >
              <CornerDownLeft size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Lista de Etiquetas Existentes */}
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2C2E3B]/40">
        {filteredTags.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-[#82889A] select-none">
            Sem dados
          </div>
        ) : (
          filteredTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.name);

            return (
              <div
                key={tag.id}
                onClick={() => onToggleTag(tag.name)}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252733] ${
                  isSelected ? 'bg-violet-500/10 dark:bg-violet-500/15' : ''
                }`}
              >
                {/* Badge da Etiqueta padronizado */}
                <TagBadge name={tag.name} color={tag.color} className="max-w-[260px] sm:max-w-md" />

                {/* Checkmark no lado direito se selecionado */}
                {isSelected && (
                  <Check size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
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
