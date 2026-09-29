import React, { useState, useMemo } from 'react';
import { X, Search, PlusCircle, Trash2, Edit2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import {
  ExtensionCategory,
  useExtensionCategories,
} from '@/utils/extension-categories';
import { ModalCriarCategoria } from '@/components/ui/modal-criar-categoria';

interface ModalGerenciarCategoriasProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalGerenciarCategorias: React.FC<
  ModalGerenciarCategoriasProps
> = ({ isOpen, onClose }) => {
  const { categories, removeCategory } = useExtensionCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] =
    useState<ExtensionCategory | null>(null);

  // Filtra as categorias criadas pelo usuário (não exibe o kit_basico padrão como "dado criado")
  const filteredCategories = useMemo(() => {
    const userCategories = categories.filter((c) => !c.isDefault);
    const q = searchQuery.trim().toLowerCase();

    if (!q) return userCategories;

    return userCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.extensions?.some((ext) => ext.name.toLowerCase().includes(q)),
    );
  }, [categories, searchQuery]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (category: ExtensionCategory) => {
    setCategoryToEdit(category);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir a categoria "${name}"?`)) {
      removeCategory(id);
      toast.success('Categoria excluída com sucesso');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <div className="relative z-10 flex w-full max-w-3xl max-h-[85vh] flex-col rounded-2xl border border-[#333543] bg-[#22242C] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#2F3240] px-6 select-none">
            <span className="text-base font-semibold text-white">Categoria</span>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Barra de Ações: Botão Nova categoria + Busca */}
          <div className="flex shrink-0 items-center gap-3.5 px-6 pt-5 pb-4 select-none">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#1C1D24] border border-white/30 hover:border-white px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#252834] active:scale-[0.98]"
            >
              <PlusCircle size={15} />
              <span>Nova categoria</span>
            </button>

            <div className="relative w-64">
              <Search
                size={14}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="h-8.5 w-full rounded-lg border border-[#3A3D4B] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#686C7E] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tabela de Categorias */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#2D303E] bg-[#1A1C24]">
              {/* Cabeçalho da Tabela */}
              <div className="grid grid-cols-12 border-b border-[#2D303E] bg-[#1E202A] px-4 py-3 text-[12px] font-medium text-[#8E92A2] select-none">
                <div className="col-span-3">Nome</div>
                <div className="col-span-4">Observação</div>
                <div className="col-span-3">Extensão</div>
                <div className="col-span-2 text-right">Ação</div>
              </div>

              {/* Corpo da Tabela */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="grid grid-cols-12 items-center border-b border-[#262835] px-4 py-3 text-xs transition-colors hover:bg-[#222530]"
                    >
                      {/* Nome */}
                      <div className="col-span-3 font-semibold text-white truncate pr-2">
                        {cat.name}
                      </div>

                      {/* Observação */}
                      <div
                        className="col-span-4 text-[#8E92A2] truncate pr-2"
                        title={cat.description}
                      >
                        {cat.description || '-'}
                      </div>

                      {/* Extensões */}
                      <div className="col-span-3 flex items-center gap-1.5 min-w-0 pr-2">
                        {cat.extensions && cat.extensions.length > 0 ? (
                          <div className="flex items-center gap-1 overflow-hidden">
                            {cat.extensions.slice(0, 3).map((ext) => (
                              <div
                                key={ext.id}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-[#363948] bg-[#14151C] p-0.5"
                                title={ext.name}
                              >
                                {ext.iconUrl ? (
                                  <img
                                    src={ext.iconUrl}
                                    alt={ext.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-[#2F80ED]">
                                    {ext.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            ))}
                            {cat.extensions.length > 3 && (
                              <span className="shrink-0 rounded-md bg-[#252834] px-1.5 py-0.5 text-[10px] font-medium text-[#8E92A2]">
                                +{cat.extensions.length - 3}
                              </span>
                            )}
                            <span className="ml-1 shrink-0 text-[11px] text-[#717586]">
                              ({cat.extensions.length})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#686C7E]">-</span>
                        )}
                      </div>

                      {/* Ação */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="cursor-pointer rounded-md p-1.5 text-[#8E92A2] transition-colors hover:bg-[#2A2C38] hover:text-white"
                          title="Editar categoria"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="cursor-pointer rounded-md p-1.5 text-[#8E92A2] transition-colors hover:bg-[#34181E] hover:text-[#FF6B6B]"
                          title="Excluir categoria"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Estado Vazio "Sem dados" fiel ao design */
                  <div className="flex h-56 flex-col items-center justify-center select-none text-[#717586]">
                    <span className="text-sm font-medium">Sem dados</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criação / Edição de Categoria */}
      <ModalCriarCategoria
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCategoryToEdit(null);
        }}
        categoryToEdit={categoryToEdit}
      />
    </>
  );
};

// Aliases para compatibilidade
export const ModalCategoriasExtensao = ModalGerenciarCategorias;
export default ModalGerenciarCategorias;
