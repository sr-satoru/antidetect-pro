import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  PlusCircle,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useRegisteredExtensions } from '@/services/extensoes/service.extensoes';
import {
  useExtensionCategories,
  ExtensionCategory,
} from '@/services/extensoes/service.categorias';
import { ModalCriarCategoria } from '@/components/ui/modal-criar-categoria';

interface AvancadoTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

export const AvancadoTab: React.FC<AvancadoTabProps> = ({
  formData,
  onChange,
}) => {
  const [showExtensionDropdown, setShowExtensionDropdown] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);

  const { extensions: teamExtensions, loading: loadingExtensions } =
    useRegisteredExtensions({ onlyEnabled: true });
  const { categories } = useExtensionCategories();

  const currentMode = formData.extensionMode || 'team';
  const selectedCategory = formData.extensionCategory || 'kit_basico';

  // Sincroniza extensões padrão quando carregadas
  React.useEffect(() => {
    if (
      currentMode === 'team' &&
      (!formData.extensions || formData.extensions.length === 0) &&
      teamExtensions.length > 0
    ) {
      onChange('extensions', teamExtensions);
    } else if (currentMode === 'category' && selectedCategory) {
      const found = categories.find((c) => c.id === selectedCategory);
      const exts =
        selectedCategory === 'kit_basico' &&
        (!found?.extensions || found.extensions.length === 0)
          ? teamExtensions
          : found?.extensions || [];

      if ((!formData.extensions || formData.extensions.length === 0) && exts.length > 0) {
        onChange('extensions', exts);
      }
    }
  }, [
    currentMode,
    selectedCategory,
    categories,
    teamExtensions,
    formData.extensions,
    onChange,
  ]);

  const handleSelectMode = (
    mode: string,
    categoryId?: string,
    explicitCategory?: ExtensionCategory,
  ) => {
    onChange('extensionMode', mode);
    if (categoryId) {
      onChange('extensionCategory', categoryId);
      const found =
        explicitCategory || categories.find((c) => c.id === categoryId);
      if (found) {
        const exts =
          categoryId === 'kit_basico' &&
          (!found.extensions || found.extensions.length === 0)
            ? teamExtensions
            : found.extensions || [];
        onChange('extensions', exts);
      }
    } else if (mode === 'team') {
      onChange('extensions', teamExtensions);
    } else if (mode === 'none') {
      onChange('extensions', []);
    }
    setShowExtensionDropdown(false);
  };

  const getDisplayLabel = () => {
    if (currentMode === 'none') return 'Não usar extensões';
    if (currentMode === 'team') return 'Usar extensões da equipe';
    if (currentMode === 'category') {
      const found = categories.find((c) => c.id === selectedCategory);
      return found ? found.name : 'kit basico';
    }
    return 'Select';
  };

  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      {/* Campo Extensões conforme o layout padrão */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Extensões
        </label>

        <div className="flex-1 max-w-2xl">
          {/* Dropdown Seletor */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExtensionDropdown(!showExtensionDropdown)}
              className="flex min-h-[38px] w-full cursor-pointer items-center justify-between rounded-lg border border-[#3A3D4B] bg-[#22242B] px-3.5 py-2 text-[13px] text-[#A6ABB9] transition-colors hover:border-[#4B4E5E] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            >
              <span className={currentMode ? 'text-white' : 'text-[#7B7F91]'}>
                {getDisplayLabel()}
              </span>
              {showExtensionDropdown ? (
                <ChevronUp size={15} className="text-[#8E92A2]" />
              ) : (
                <ChevronDown size={15} className="text-[#8E92A2]" />
              )}
            </button>

            {showExtensionDropdown && (
              <div className="absolute top-full left-0 z-30 mt-1 w-full rounded-xl border border-[#383A49] bg-[#22242B] py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                {/* 1. Botão Topo: + Nova categoria */}
                <button
                  type="button"
                  onClick={() => {
                    setShowExtensionDropdown(false);
                    setShowCreateCategoryModal(true);
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2A2C35]"
                >
                  <PlusCircle size={15} className="text-white" />
                  <span>Nova categoria</span>
                </button>

                <div className="mx-3 my-1 h-[1px] bg-[#2D2F3A]" />

                {/* 2. Opção: Usar extensões da equipe */}
                <div className="px-2 py-1">
                  <div
                    onClick={() => handleSelectMode('team')}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors ${currentMode === 'team'
                        ? 'bg-[#2A2C35] font-medium text-white'
                        : 'text-[#C5C8D6] hover:bg-[#2A2C35] hover:text-white'
                      }`}
                  >
                    <span>Usar extensões da equipe</span>
                    {currentMode === 'team' && (
                      <Check size={14} className="text-white" />
                    )}
                  </div>
                </div>

                {/* 3. Opções de Categorias (kit basico e categorias personalizadas) */}
                {categories.map((cat: ExtensionCategory) => {
                  const isSelected =
                    currentMode === 'category' && selectedCategory === cat.id;

                  // Se for kit basico usa as da equipe caso a categoria não tenha lista própria
                  const categoryExtensions =
                    cat.id === 'kit_basico' && (!cat.extensions || cat.extensions.length === 0)
                      ? teamExtensions
                      : cat.extensions || [];

                  return (
                    <div key={cat.id} className="px-2 py-0.5">
                      <div
                        onClick={() => handleSelectMode('category', cat.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${isSelected ? 'bg-[#2A2C35]' : 'hover:bg-[#2A2C35]'
                          }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-white">
                            {cat.name}
                          </span>

                          {/* Miniaturas das extensões com badge verde */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                            {cat.id === 'kit_basico' && loadingExtensions ? (
                              <span className="text-[11px] text-[#6E7385]">
                                Carregando extensões...
                              </span>
                            ) : categoryExtensions.length > 0 ? (
                              categoryExtensions.map((ext: any) => (
                                <div
                                  key={ext.id}
                                  title={ext.name}
                                  className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-[#383A4A] bg-[#1A1C24] p-0.5 shadow-2xs"
                                >
                                  {ext.iconUrl ? (
                                    <img
                                      src={ext.iconUrl}
                                      alt={ext.name}
                                      className="h-full w-full rounded-[3px] object-contain"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-white">
                                      {ext.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                  <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#52C41A] ring-1 ring-[#1A1C24]" />
                                </div>
                              ))
                            ) : (
                              <span className="text-[11px] text-[#6E7385]">
                                Nenhuma extensão selecionada nesta categoria
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-3 shrink-0 flex items-center gap-2">
                          {isSelected && (
                            <Check size={14} className="text-white" />
                          )}
                          <div
                            title={cat.description || 'Categoria de extensões'}
                          >
                            <AlertCircle
                              size={15}
                              className="text-[#6E7385] hover:text-[#9BA1B4]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 4. Footer: Não há mais conteúdo */}
                <div className="pt-3 pb-2 text-center text-[11px] text-[#6E7385] select-none">
                  Não há mais conteúdo
                </div>
              </div>
            )}
          </div>

          {/* Subtítulo / Descrição */}
          <p className="pt-2 text-[12px] text-[#6E7385] leading-relaxed">
            As extensões habilitadas de{' '}
            <span className="text-[#9BA1B4]">
              [Extensões - Extensões da equipe]
            </span>{' '}
            serão instaladas no perfil
          </p>
        </div>
      </div>

      {/* Modal para criar Nova Categoria */}
      <ModalCriarCategoria
        isOpen={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onSuccess={(newCat) => {
          handleSelectMode('category', newCat.id, newCat);
        }}
      />
    </div>
  );
};

export default AvancadoTab;

