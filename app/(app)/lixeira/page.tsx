import React, { useState, useMemo } from 'react';
import initialLixeiraData from '@/data/lixeira.json';
import {
  HeaderLixeira,
  TabelaLixeira,
  ItemLixeira,
} from '@/components/lixeira';
import { Trash2, CheckCircle2, X } from 'lucide-react';

export const LixeiraPage: React.FC = () => {
  const [items, setItems] = useState<ItemLixeira[]>(
    initialLixeiraData as ItemLixeira[],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos os grupos');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  // Distinct groups
  const groups = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.group).filter(Boolean)));
    return list.sort();
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        String(item.originalId).includes(q) ||
        (item.ip && item.ip.toLowerCase().includes(q)) ||
        (item.country && item.country.toLowerCase().includes(q)) ||
        (item.deletedBy && item.deletedBy.toLowerCase().includes(q));

      const matchesGroup =
        selectedGroup === 'Todos os grupos' || item.group === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [items, searchQuery, selectedGroup]);

  // Selection handlers
  const handleSelectItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (
      filteredItems.length > 0 &&
      selectedIds.length === filteredItems.length
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  // Action handlers
  const handleRestore = (id: number) => {
    const target = items.find((item) => item.id === id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    showNotification(
      `Perfil "${target?.name || id}" restaurado com sucesso!`,
    );
  };

  const handleRestoreSelected = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    showNotification(`${count} perfil(is) restaurado(s) com sucesso!`);
  };

  const handleDeletePermanent = (id: number) => {
    const target = items.find((item) => item.id === id);
    if (
      window.confirm(
        `Tem certeza que deseja excluir permanentemente o perfil "${target?.name || id}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      showNotification('Perfil excluído permanentemente.');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (
      window.confirm(
        `Tem certeza que deseja excluir permanentemente os ${selectedIds.length} perfis selecionados? Esta ação não pode ser desfeita.`,
      )
    ) {
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      showNotification(
        'Perfis selecionados excluídos permanentemente da lixeira.',
      );
    }
  };

  const handleEmptyTrash = () => {
    if (items.length === 0) return;
    if (
      window.confirm(
        'Tem certeza que deseja esvaziar toda a lixeira? Todos os perfis serão removidos permanentemente.',
      )
    ) {
      setItems([]);
      setSelectedIds([]);
      showNotification('A lixeira foi completamente esvaziada.');
    }
  };

  const handleRefresh = () => {
    setItems(initialLixeiraData as ItemLixeira[]);
    setSelectedIds([]);
    showNotification('Lista da lixeira atualizada.');
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-[#181920] p-4 gap-3">
      {/* Cabeçalho da Página */}
      <div className="flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3E404D] bg-[#24252B] text-[#DFE104] shadow-xs">
            <Trash2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Lixeira de Perfis
              </h1>
              <span className="rounded-full bg-[#24252B] border border-[#3E404D] px-2 py-0.5 text-[11px] font-semibold text-[#A9ACB9]">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <p className="text-xs text-[#8E92A2]">
              Gerencie e restaure perfis excluídos recentemente para o painel principal.
            </p>
          </div>
        </div>

        {/* Notificação Temporária de Ação */}
        {notification && (
          <div className="flex items-center gap-2 rounded-lg border border-[#DFE104]/30 bg-[#24252B] px-3.5 py-1.5 text-xs text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 size={15} className="text-[#DFE104] shrink-0" />
            <span>{notification}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-[#8E92A2] hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Barra de Filtro e Ações em Lote */}
      <HeaderLixeira
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        groups={groups}
        selectedCount={selectedIds.length}
        totalCount={items.length}
        onRestoreSelected={handleRestoreSelected}
        onDeleteSelected={handleDeleteSelected}
        onEmptyTrash={handleEmptyTrash}
        onRefresh={handleRefresh}
      />

      {/* Tabela de Itens Excluídos */}
      <TabelaLixeira
        items={filteredItems}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
        onRestore={handleRestore}
        onDeletePermanent={handleDeletePermanent}
      />
    </div>
  );
};

export default LixeiraPage;
