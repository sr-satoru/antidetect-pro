import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import {
  ExtensionCategory,
  ExtensionItemSummary,
  searchExtensionsForCategory,
  useExtensionCategories,
} from '@/utils/extension-categories';
import { useRegisteredExtensions } from '@/utils/extensions';

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
        const enriched = (categoryToEdit.extensions || []).map((ext) => {
          let url = ext.providerUrl;
          if (!url) {
            const match = teamExtensions.find(
              (t) => String(t.id) === String(ext.id) || t.name?.toLowerCase() === ext.name?.toLowerCase()
            );
            url = match?.providerUrl || match?.provider_url;
          }
          if (!url && ext.id && !String(ext.id).includes('/') && !String(ext.id).startsWith('local_') && isNaN(Number(ext.id))) {
            url = `https://addons.mozilla.org/firefox/addon/${ext.id}/`;
          }
          return { ...ext, providerUrl: url || ext.providerUrl };
        });
        setSelectedExtensions(enriched);
      } else {
        setNome('');
        setObservacao('');
        setSelectedExtensions([]);
      }
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  }, [isOpen, categoryToEdit, teamExtensions]);

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
        let url = ext.providerUrl;
        if (!url) {
          const match = teamExtensions.find(
            (t) => String(t.id) === String(ext.id) || t.name?.toLowerCase() === ext.name?.toLowerCase()
          );
          url = match?.providerUrl || match?.provider_url;
        }
        if (!url && ext.id && !String(ext.id).includes('/') && !String(ext.id).startsWith('local_') && isNaN(Number(ext.id))) {
          url = `https://addons.mozilla.org/firefox/addon/${ext.id}/`;
        }
        return [...prev, { ...ext, providerUrl: url || ext.providerUrl }];
      }
    });
  };

  const isExtensionSelected = (id: string | number) => {
    return selectedExtensions.some((item) => String(item.id) === String(id));
  };

  const handleConfirm = () => {
    if (!nome.trim()) {
      toast.warning('Por favor, informe o nome da categoria.');
      return;
    }

    const enrichedExtensions = selectedExtensions.map((ext) => {
      let url = ext.providerUrl;
      if (!url) {
        const match = teamExtensions.find(
          (t) => String(t.id) === String(ext.id) || t.name?.toLowerCase() === ext.name?.toLowerCase()
        );
        url = match?.providerUrl || match?.provider_url;
      }
      if (!url && ext.id && !String(ext.id).includes('/') && !String(ext.id).startsWith('local_') && isNaN(Number(ext.id))) {
        url = `https://addons.mozilla.org/firefox/addon/${ext.id}/`;
      }
      return {
        ...ext,
        providerUrl: url || ext.providerUrl,
      };
    });

    if (categoryToEdit) {
      const updated = updateCategory(categoryToEdit.id, {
        name: nome.trim(),
        description: observacao.trim(),
        extensions: enrichedExtensions,
      });

      toast.success('Categoria atualizada com sucesso');
      if (onSuccess && updated) {
        onSuccess(updated);
      }
    } else {
      const created = addCategory({
        name: nome.trim(),
        description: observacao.trim(),
        extensions: enrichedExtensions,
      });

      toast.success('Categoria criada com sucesso');
      if (onSuccess) {
        onSuccess(created);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex w-full max-w-[540px] max-h-[90vh] flex-col rounded-2xl border border-[#333543] bg-[#22242C] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#2F3240] px-6 select-none">
          <span className="text-base font-semibold text-white">
            {categoryToEdit ? 'Editar categoria' : 'Nova categoria'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-5 p-6 custom-scrollbar">
          {/* Campo Nome */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[90px] sm:text-right">
              <span className="mr-1 text-[#EB5757] font-semibold">*</span>
              Nome
            </label>
            <div className="relative flex-1">
              <input
                type="text"
                value={nome}
                maxLength={50}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Por favor, insira."
                className="w-full rounded-lg border border-[#3A3D4B] bg-[#1E2028] px-3.5 py-2.5 pr-16 text-[13px] text-white placeholder-[#5A5E70] transition-colors focus:border-[#2F80ED] focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#6E7385] select-none">
                {nome.length} / 50
              </span>
            </div>
          </div>

          {/* Campo Observação */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <label className="shrink-0 pt-2 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[90px] sm:text-right">
              Observação
            </label>
            <div className="relative flex-1">
              <textarea
                value={observacao}
                maxLength={500}
                rows={2}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Por favor, insira."
                className="w-full resize-none rounded-lg border border-[#3A3D4B] bg-[#1E2028] px-3.5 py-2.5 pb-6 text-[13px] text-white placeholder-[#5A5E70] transition-colors focus:border-[#2F80ED] focus:outline-none"
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-[#6E7385] select-none">
                {observacao.length} / 500
              </span>
            </div>
          </div>

          {/* Campo Extensão */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <label className="shrink-0 pt-2 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[90px] sm:text-right">
              Extensão
            </label>

            <div className="flex-1" ref={dropdownRef}>
              {/* Botão tracejado Selecionar Extensão */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-[13px] font-medium transition-all active:scale-[0.99] ${
                  isDropdownOpen
                    ? 'border-[#2F80ED] bg-[#222736] text-white'
                    : 'border-[#4B4E5F] bg-[#1E2028]/70 text-white hover:border-[#6C7186] hover:bg-[#252732]'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60">
                  <Plus size={12} className="text-white" />
                </div>
                <span>Selecionar Extensão</span>
              </button>

              {/* Badges das extensões selecionadas */}
              {selectedExtensions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2.5">
                  {selectedExtensions.map((ext) => (
                    <div
                      key={ext.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#3B3E4F] bg-[#181920] px-2 py-1 text-xs text-[#D2D5DF]"
                    >
                      {ext.iconUrl ? (
                        <img
                          src={ext.iconUrl}
                          alt=""
                          className="h-3.5 w-3.5 object-contain"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-[#2F80ED]">
                          {ext.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="max-w-[120px] truncate text-[11.5px]">
                        {ext.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExtension(ext);
                        }}
                        className="cursor-pointer text-[#7B8092] transition-colors hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Painel com Busca e Lista de Extensões */}
              {isDropdownOpen && (
                <div className="mt-2.5 w-full rounded-xl border border-[#383A49] bg-[#1C1E26] p-2.5 shadow-2xl animate-in fade-in duration-100">
                  {/* Campo de Busca */}
                  <div className="relative mb-2">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E92A2]"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search"
                      className="w-full rounded-lg border border-[#353847] bg-[#13141C] py-2 pl-9 pr-8 text-[12.5px] text-white placeholder-[#5D6274] transition-colors focus:border-[#2F80ED] focus:outline-none"
                    />
                    {searching && (
                      <Loader2
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#2F80ED]"
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
                                ? 'bg-[#262A38] text-white'
                                : 'hover:bg-[#282A36] text-[#D8DBE5]'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-[#363948] bg-[#14151C] p-0.5">
                                {ext.iconUrl ? (
                                  <img
                                    src={ext.iconUrl}
                                    alt=""
                                    className="h-full w-full rounded-[3px] object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-[#2F80ED]">
                                    {ext.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#52C41A] ring-1 ring-[#14151C]" />
                              </div>

                              <span className="truncate text-[12.5px]">
                                {ext.name}
                              </span>
                            </div>

                            <div className="ml-2 shrink-0">
                              <Check
                                size={14}
                                className={
                                  selected
                                    ? 'text-[#2F80ED]'
                                    : 'text-[#484C5E]'
                                }
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-4 text-center text-xs text-[#7B8092]">
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
        <div className="flex h-16 shrink-0 items-center justify-end gap-3 border-t border-[#2F3240] bg-[#1C1D24] px-6 select-none rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!nome.trim()}
            className="flex cursor-pointer items-center justify-center rounded-lg bg-[#1C1D24] border border-white/30 hover:border-white px-6 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#252834] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// Aliases para compatibilidade
export const ModalNovaCategoriaExtensao = ModalCriarCategoria;
export default ModalCriarCategoria;
