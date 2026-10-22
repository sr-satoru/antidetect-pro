import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import {
  ExtensionCategory,
  ExtensionItemSummary,
  searchExtensionsForCategory,
  useExtensionCategories,
} from '@/services/extensoes/service.categorias';
import { useRegisteredExtensions } from '@/services/extensoes/service.extensoes';

interface ModalCriarCategoriaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (category: ExtensionCategory) => void;
  categoryToEdit?: ExtensionCategory | null;
}

export const ModalCriarCategoria: React.FC<ModalCriarCategoriaProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categoryToEdit,
}) => {
  const { addCategory, updateCategory } = useExtensionCategories();
  const { extensions: teamExtensions } = useRegisteredExtensions();

  const [nome, setNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [selectedExtensions, setSelectedExtensions] = useState<
    ExtensionItemSummary[]
  >([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExtensionItemSummary[]>(
    [],
  );
  const [searching, setSearching] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reseta ou popula campos quando o modal abre
  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setNome(categoryToEdit.name || '');
        setObservacao(categoryToEdit.description || '');
        setSelectedExtensions(categoryToEdit.extensions || []);
      } else {
        setNome('');
        setObservacao('');
        setSelectedExtensions([]);
      }
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  }, [isOpen, categoryToEdit]);

  // Carrega opções iniciais ao abrir o dropdown ou quando a busca muda
  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchExtensionsForCategory(
          searchQuery,
          teamExtensions,
        );
        if (isCurrent) {
          setSearchResults(results);
        }
      } catch (err) {
        console.error('Erro na pesquisa de extensões:', err);
      } finally {
        if (isCurrent) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery, teamExtensions]);

  // Foco no input de busca ao abrir o dropdown
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isDropdownOpen]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  const toggleExtension = (ext: ExtensionItemSummary) => {
    setSelectedExtensions((prev) => {
      const exists = prev.some((item) => String(item.id) === String(ext.id));
      if (exists) {
        return prev.filter((item) => String(item.id) !== String(ext.id));
      } else {
        return [...prev, ext];
      }
    });
  };

  const isExtensionSelected = (id: string | number) => {
    return selectedExtensions.some((item) => String(item.id) === String(id));
  };

  const handleConfirm = async () => {
    if (!nome.trim()) {
      toast.warning('Por favor, informe o nome da categoria.');
      return;
    }

    if (categoryToEdit) {
      const updated = await updateCategory(categoryToEdit.id, {
        name: nome.trim(),
        description: observacao.trim(),
        extensions: selectedExtensions,
      });

      toast.success('Categoria atualizada com sucesso');
      if (onSuccess && updated) {
        onSuccess(updated);
      }
    } else {
      const created = await addCategory({
        name: nome.trim(),
        description: observacao.trim(),
        extensions: selectedExtensions,
      });

      toast.success('Categoria criada com sucesso');
      if (onSuccess && created) {
        onSuccess(created);
      }
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[11vh] sm:pt-[13vh] p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex w-full max-w-[590px] max-h-[85vh] flex-col rounded-2xl border border-slate-200 dark:border-[#333543] bg-white dark:bg-[#22242C] shadow-2xl shadow-slate-900/15 dark:shadow-black/95 animate-in fade-in zoom-in-95 duration-150 mb-12">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 dark:border-[#2F3240] px-7 select-none">
          <span className="text-base font-semibold text-slate-900 dark:text-white">
            {categoryToEdit ? 'Editar categoria' : 'Nova categoria'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#9DA2B4] transition-colors dark:hover:bg-[#2C2E38] dark:hover:text-white"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-6 p-7 custom-scrollbar">
          {/* Campo Nome */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="shrink-0 text-left text-xs font-medium text-slate-700 dark:text-[#A6ABB9] select-none sm:w-[90px] sm:text-right">
              <span className="mr-1 text-red-500 font-semibold">*</span>
              Nome
            </label>
            <div className="relative flex-1">
              <input
                type="text"
                value={nome}
                maxLength={50}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Por favor, insira o nome da categoria."
                className="h-9 w-full rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 pr-16 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] transition-colors focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 dark:text-[#6E7385] select-none">
                {nome.length} / 50
              </span>
            </div>
          </div>

          {/* Campo Observação */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <label className="shrink-0 pt-2 text-left text-xs font-medium text-slate-700 dark:text-[#A6ABB9] select-none sm:w-[90px] sm:text-right">
              Observação
            </label>
            <div className="relative flex-1">
              <textarea
                value={observacao}
                maxLength={500}
                rows={2}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Por favor, insira uma observação."
                className="w-full resize-none rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 py-2 pb-6 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] transition-colors focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-slate-400 dark:text-[#6E7385] select-none">
                {observacao.length} / 500
              </span>
            </div>
          </div>

          {/* Campo Extensão */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <label className="shrink-0 pt-2 text-left text-xs font-medium text-slate-700 dark:text-[#A6ABB9] select-none sm:w-[90px] sm:text-right">
              Extensão
            </label>

            <div className="flex-1" ref={dropdownRef}>
              {/* Botão tracejado Selecionar Extensão */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-xs font-medium transition-all active:scale-[0.99] ${
                  isDropdownOpen
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:border-white/40 dark:bg-white/10 dark:text-white'
                    : 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#1E2028]/70 text-slate-700 dark:text-white hover:border-slate-400 dark:hover:border-white/40 hover:bg-slate-100 dark:hover:bg-[#252732]'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 dark:border-white/60">
                  <Plus size={12} className="text-slate-600 dark:text-white" />
                </div>
                <span>Selecionar Extensão</span>
              </button>

              {/* Badges das extensões selecionadas */}
              {selectedExtensions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2.5">
                  {selectedExtensions.map((ext) => (
                    <div
                      key={ext.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#3B3E4F] bg-slate-100 dark:bg-[#181920] px-2 py-1 text-xs text-slate-800 dark:text-[#D2D5DF]"
                    >
                      {ext.iconUrl ? (
                        <img
                          src={ext.iconUrl}
                          alt=""
                          className="h-3.5 w-3.5 object-contain"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-[#00FF66]">
                          {ext.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="max-w-[120px] truncate text-xs">
                        {ext.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExtension(ext);
                        }}
                        className="cursor-pointer text-slate-400 hover:text-slate-700 dark:text-[#7B8092] transition-colors dark:hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Painel com Busca e Lista de Extensões */}
              {isDropdownOpen && (
                <div className="mt-2.5 w-full rounded-xl border border-slate-200 dark:border-[#383A49] bg-white dark:bg-[#1C1E26] p-2.5 shadow-xl shadow-slate-900/10 dark:shadow-2xl animate-in fade-in duration-100">
                  {/* Campo de Busca */}
                  <div className="relative mb-2">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4]"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar..."
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#13141C] pl-9 pr-8 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5D6274] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:outline-none"
                    />
                    {searching && (
                      <Loader2
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-600 dark:text-[#00FF66]"
                      />
                    )}
                  </div>

                  {/* Lista de Extensões */}
                  <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
                    {searchResults.length > 0 ? (
                      searchResults.map((ext) => {
                        const selected = isExtensionSelected(ext.id);
                        return (
                          <div
                            key={ext.id}
                            onClick={() => toggleExtension(ext)}
                            className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-colors ${
                              selected
                                ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white'
                                : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-[#D8DBE5]'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#14151C] p-0.5">
                                {ext.iconUrl ? (
                                  <img
                                    src={ext.iconUrl}
                                    alt=""
                                    className="h-full w-full rounded-[3px] object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-[#00FF66]">
                                    {ext.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-[#00FF66] ring-1 ring-white dark:ring-[#14151C]" />
                              </div>

                              <span className="truncate text-xs">
                                {ext.name}
                              </span>
                            </div>

                            <div className="ml-2 shrink-0">
                              <Check
                                size={14}
                                className={
                                  selected
                                    ? 'text-emerald-600 dark:text-[#00FF66]'
                                    : 'text-slate-300 dark:text-[#484C5E]'
                                }
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-400 dark:text-[#7B8092]">
                        {searching
                          ? 'Buscando extensões...'
                          : 'Nenhuma extensão encontrada'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer fixo e sempre visível */}
        <div className="flex h-14 shrink-0 items-center justify-end gap-2.5 border-t border-slate-200/80 dark:border-[#2D3039] bg-slate-50/80 dark:bg-[#141519] px-6 select-none rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-xs font-medium text-slate-700 dark:text-[#E2E4EC] hover:bg-slate-100 dark:hover:bg-[#282A33] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-2xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!nome.trim()}
            className="flex h-9 items-center justify-center rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 text-xs font-semibold shadow-xs shadow-[#7C3AED]/20 transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Aliases para compatibilidade
export const ModalNovaCategoriaExtensao = ModalCriarCategoria;
export default ModalCriarCategoria;
