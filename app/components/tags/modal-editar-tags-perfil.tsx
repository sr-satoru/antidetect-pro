import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronUp, Check, CornerDownLeft, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { TagItem, serviceTags } from '../../services/tags/service.tags';
import { TAG_COLORS, DEFAULT_TAG_COLOR, getTagColorStyle, getPastelTagStyle } from './tag-palette';
import { api } from '@/services/index.api';

interface ModalEditarTagsPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdated?: (updatedProfile: any) => void;
}

export const ModalEditarTagsPerfil: React.FC<ModalEditarTagsPerfilProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [tags, setTags] = useState<TagItem[]>([]);
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Cor selecionada para criar nova tag
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Carrega catálogo de tags
  const fetchTags = async () => {
    try {
      const res = await serviceTags.list();
      setTags(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Erro ao listar tags:', err);
    }
  };

  useEffect(() => {
    if (isOpen && profile) {
      fetchTags();
      setSearchTerm('');
      setIsDropdownOpen(false);
      setShowColorPicker(false);
      setNewTagColor(DEFAULT_TAG_COLOR);

      // Normaliza as tags atuais do perfil
      const currentTags = Array.isArray(profile.tags)
        ? (profile.tags as any[])
            .map((t: any) => (typeof t === 'string' ? t : t?.name || ''))
            .filter(Boolean)
        : typeof profile.tags === 'string' && profile.tags
        ? profile.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];
      setProfileTags(currentTags);
    }
  }, [isOpen, profile]);

  // Fechar ao clicar fora do container do seletor
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setShowColorPicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showColorPicker) {
          setShowColorPicker(false);
        } else if (isDropdownOpen) {
          setIsDropdownOpen(false);
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
  }, [isOpen, isDropdownOpen, showColorPicker, onClose]);

  // Filtragem das tags disponíveis pela busca
  const filteredTags = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchTerm]);

  // Verifica se já existe uma tag exatamente igual à digitada
  const exactMatch = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return null;
    return tags.find((t) => t.name.toLowerCase() === q);
  }, [tags, searchTerm]);

  // Alterna uma tag no perfil
  const handleToggleTag = (tagName: string) => {
    setProfileTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName],
    );
  };

  // Remove uma tag do perfil
  const handleRemoveTag = (tagName: string) => {
    setProfileTags((prev) => prev.filter((t) => t !== tagName));
  };

  // Limpa todas as tags selecionadas
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileTags([]);
    setSearchTerm('');
  };

  // Criar ou selecionar tag pelo input
  const handleCreateOrSelectTag = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed || isCreatingTag) return;

    if (exactMatch) {
      if (!profileTags.includes(exactMatch.name)) {
        setProfileTags((prev) => [...prev, exactMatch.name]);
      }
      setSearchTerm('');
      setShowColorPicker(false);
      return;
    }

    try {
      setIsCreatingTag(true);
      const createdTag = await serviceTags.create({
        name: trimmed,
        color: newTagColor,
      });

      setTags((prev) => {
        const exists = prev.some(
          (t) => t.id === createdTag.id || t.name.toLowerCase() === createdTag.name.toLowerCase(),
        );
        return exists ? prev : [...prev, createdTag];
      });

      if (!profileTags.includes(createdTag.name)) {
        setProfileTags((prev) => [...prev, createdTag.name]);
      }

      setSearchTerm('');
      setShowColorPicker(false);
      toast.success('Etiqueta criada com sucesso');
    } catch (err: any) {
      toast.error(`Erro ao criar etiqueta: ${err.message || 'Falha ao salvar'}`);
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Salvar no perfil (botão OK)
  const handleSave = async () => {
    if (!profile) return;
    try {
      setIsSaving(true);
      await api.profiles.update(String(profile.id), {
        tags: profileTags,
      });

      const updated = {
        ...profile,
        tags: profileTags,
      };

      onProfileUpdated?.(updated);
      toast.success('Etiquetas atualizadas com sucesso');
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message || 'Falha na comunicação'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !profile) return null;

  // Número/ID do perfil formatado
  const profileNumber =
    profile.serial_number ||
    profile.profile_number ||
    (profile.id !== undefined ? String(profile.id) : '-');

  const currentBadgeStyle = getTagColorStyle(newTagColor);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] sm:pt-[14vh] bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={() => onClose()}
    >
      <div
        className="w-full max-w-[620px] rounded-2xl border border-slate-200 dark:border-[#323543] bg-white dark:bg-[#1E1F24] shadow-2xl dark:shadow-black/90 overflow-visible text-left select-none animate-in zoom-in-95 duration-150 mb-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: "Definir tag" e botão fechar "✕" */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            Definir tag
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#8E92A2] dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-7 pb-7 space-y-6">
          {/* Linha 1: Nº de perfil */}
          <div className="flex items-center gap-5">
            <label className="w-24 text-right text-[13px] text-slate-500 dark:text-[#8E92A2] shrink-0 font-normal">
              Nº de perfil
            </label>
            <div className="flex items-center">
              <span className="inline-flex items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-[#15233E] dark:border dark:border-[#1E3A6E]/80 dark:text-[#3884FF] px-3 py-1 text-xs font-semibold">
                {profileNumber}
              </span>
            </div>
          </div>

          {/* Linha 2: Tags */}
          <div className="flex items-start gap-5">
            <label className="w-24 text-right text-[13px] text-slate-500 dark:text-[#8E92A2] shrink-0 font-normal pt-2.5">
              Tags
            </label>

            <div ref={containerRef} className="relative flex-1">
              {/* Campo Seletor / Input Container */}
              <div
                onClick={() => {
                  setIsDropdownOpen(true);
                  inputRef.current?.focus();
                }}
                className={`min-h-[44px] w-full rounded-lg border bg-white dark:bg-[#17181F] px-3 py-2 flex items-center flex-wrap gap-2 cursor-text transition-all ${
                  isDropdownOpen
                    ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-[#1677FF] dark:ring-[#1677FF]/25'
                    : 'border-slate-300 dark:border-[#383A48] hover:border-slate-400 dark:hover:border-[#4B4E5E]'
                }`}
              >
                {/* Tags selecionadas como chips com botão "✕" */}
                {profileTags.map((tagName) => {
                  const tagObj = tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
                  const pastelStyle = getPastelTagStyle(tagObj?.color, tagName);

                  return (
                    <span
                      key={tagName}
                      style={{
                        backgroundColor: pastelStyle.backgroundColor,
                        borderColor: pastelStyle.borderColor,
                        color: pastelStyle.color,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium leading-none select-none transition-all shadow-2xs"
                    >
                      <span className="truncate max-w-[180px]">{tagName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tagName);
                        }}
                        className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/15 transition-colors cursor-pointer"
                      >
                        <X size={10} className="stroke-[2.5]" />
                      </button>
                    </span>
                  );
                })}

                {/* Input de texto inline */}
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                    if (showColorPicker) setShowColorPicker(false);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateOrSelectTag();
                    }
                  }}
                  placeholder={
                    profileTags.length === 0
                      ? 'Encontrar uma etiqueta / Criar uma etiqueta'
                      : ''
                  }
                  className="flex-1 min-w-[140px] bg-transparent text-xs text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#6C7082] focus:outline-hidden"
                />

                {/* Controles do lado direito (limpar e abrir dropdown) */}
                <div className="flex items-center gap-1 ml-auto shrink-0 pl-1">
                  {profileTags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-[#6C7082] dark:hover:text-white transition-colors"
                      title="Limpar todas as etiquetas"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 dark:bg-[#343746] text-white">
                        <X size={10} strokeWidth={3} />
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                    className="flex h-5 w-5 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-600 dark:text-[#6C7082] dark:hover:text-white transition-colors"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-150 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Dropdown Flutuante de Seleção / Criação de Etiquetas */}
              {isDropdownOpen && (
                <div className="animate-in fade-in zoom-in-95 absolute top-full left-0 right-0 z-50 mt-1.5 rounded-lg border border-slate-200 dark:border-[#303241] bg-white dark:bg-[#1E2028] shadow-2xl shadow-slate-900/10 dark:shadow-black/90 select-none overflow-hidden duration-100">
                  {/* Opção "Criar [nome ⌄] ↵" se o usuário digitou texto */}
                  {searchTerm.trim().length > 0 && (
                    <div
                      onClick={() => handleCreateOrSelectTag()}
                      className="relative border-b border-slate-100 dark:border-[#2C2E3B] px-3.5 py-2.5 bg-slate-50 dark:bg-[#17181F]/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#252733] transition-colors"
                    >
                      {/* Seletor flutuante de cor */}
                      {showColorPicker && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="animate-in fade-in zoom-in-95 absolute bottom-full left-4 mb-2 z-60 rounded-md border border-slate-200 dark:border-[#383A49] bg-white dark:bg-[#14151B] p-2.5 shadow-xl shadow-slate-900/15 dark:shadow-black/90 duration-100"
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
                          <div className="absolute -bottom-1.5 left-10 h-3 w-3 rotate-45 border-b border-r border-slate-200 dark:border-[#383A49] bg-white dark:bg-[#14151B]" />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-[#8E92A2]">
                            {exactMatch ? 'Selecionar' : 'Criar'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!exactMatch) setShowColorPicker(!showColorPicker);
                            }}
                            style={{
                              backgroundColor: exactMatch
                                ? getTagColorStyle(exactMatch.color).backgroundColor
                                : currentBadgeStyle.backgroundColor,
                              borderColor: exactMatch
                                ? getTagColorStyle(exactMatch.color).borderColor
                                : currentBadgeStyle.borderColor,
                              color: exactMatch
                                ? getTagColorStyle(exactMatch.color).color
                                : currentBadgeStyle.color,
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                              exactMatch
                                ? 'cursor-default'
                                : 'cursor-pointer hover:brightness-110 active:scale-98'
                            }`}
                            title={
                              exactMatch
                                ? 'Etiqueta já existente'
                                : 'Clique para escolher a cor da etiqueta'
                            }
                          >
                            <span className="truncate max-w-[170px]">{searchTerm.trim()}</span>
                            {!exactMatch &&
                              (showColorPicker ? (
                                <ChevronUp size={12} className="opacity-70" />
                              ) : (
                                <ChevronDown size={12} className="opacity-70" />
                              ))}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateOrSelectTag();
                          }}
                          disabled={isCreatingTag}
                          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-800 dark:text-[#8E92A2] dark:hover:bg-[#2C2E3B] dark:hover:text-white transition-colors"
                          title={
                            exactMatch
                              ? 'Pressione Enter para selecionar'
                              : 'Pressione Enter ou clique para criar'
                          }
                        >
                          <CornerDownLeft size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de Etiquetas Cadastradas */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2C2E3B]/40">
                    {filteredTags.length === 0 ? (
                      <div className="py-7 text-center text-xs text-slate-400 dark:text-[#6C7082] select-none">
                        Sem dados
                      </div>
                    ) : (
                      filteredTags.map((tag) => {
                        const isSelected = profileTags.includes(tag.name);
                        const style = getTagColorStyle(tag.color);

                        return (
                          <div
                            key={tag.id}
                            onClick={() => handleToggleTag(tag.name)}
                            className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252733] ${
                              isSelected ? 'bg-blue-500/10 dark:bg-[#1677FF]/8' : ''
                            }`}
                          >
                            {/* Badge da Etiqueta */}
                            <span
                              style={{
                                backgroundColor: style.backgroundColor,
                                borderColor: style.borderColor,
                                color: style.color,
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: style.color }}
                              />
                              <span className="truncate max-w-[280px]">{tag.name}</span>
                            </span>

                            {/* Checkmark no lado direito se selecionado */}
                            {isSelected && (
                              <Check size={14} className="text-blue-500 dark:text-[#1677FF]" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Linha 3: Botões OK e Cancelar alinhados */}
          <div className="flex items-center gap-3 pl-[116px] pt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 min-w-[80px] cursor-pointer rounded-lg bg-[#1677FF] hover:bg-[#1677FF]/90 active:bg-blue-600 text-white px-6 text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                'OK'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 cursor-pointer rounded-lg px-5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-[#8E92A2] dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ModalEditarTagsPerfil;
