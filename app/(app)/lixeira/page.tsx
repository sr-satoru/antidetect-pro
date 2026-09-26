import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  HeaderLixeira,
  TabelaLixeira,
  ItemLixeira,
} from '@/components/lixeira';
import { Trash2, CheckCircle2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/index.api';

export const LixeiraPage: React.FC = () => {
  const [items, setItems] = useState<ItemLixeira[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos os grupos');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.profiles.listTrash();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar itens da lixeira.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

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
  const handleSelectItem = (id: string | number) => {
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
  const handleRestore = async (id: string | number) => {
    const target = items.find((item) => item.id === id);
    try {
      await api.profiles.restore(String(id));
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      toast.success(`Perfil "${target?.name || id}" restaurado com sucesso!`);
    } catch (err: any) {
      toast.error(`Falha ao restaurar perfil: ${err.message}`);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    try {
      await Promise.all(selectedIds.map((id) => api.profiles.restore(String(id))));
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      toast.success(`${count} perfil(is) restaurado(s) com sucesso!`);
    } catch (err: any) {
      toast.error(`Falha ao restaurar selecionados: ${err.message}`);
      fetchTrash();
    }
  };

  const handleDeletePermanent = async (id: string | number) => {
    const target = items.find((item) => item.id === id);
    if (
      window.confirm(
        `Tem certeza que deseja excluir permanentemente o perfil "${target?.name || id}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      try {
        await api.profiles.deletePermanent(String(id));
        setItems((prev) => prev.filter((item) => item.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        toast.success('Perfil excluído permanentemente do banco de dados.');
      } catch (err: any) {
        toast.error(`Falha ao excluir permanentemente: ${err.message}`);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      window.confirm(
        `Tem certeza que deseja excluir permanentemente os ${selectedIds.length} perfis selecionados? Esta ação não pode ser desfeita.`,
      )
    ) {
      try {
        await Promise.all(
          selectedIds.map((id) => api.profiles.deletePermanent(String(id))),
        );
        setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
        toast.success('Perfis selecionados excluídos permanentemente.');
      } catch (err: any) {
        toast.error(`Falha ao excluir selecionados: ${err.message}`);
        fetchTrash();
      }
    }
  };

  const handleEmptyTrash = async () => {
    if (items.length === 0) return;
    if (
      window.confirm(
        'Tem certeza que deseja esvaziar toda a lixeira? Todos os perfis serão removidos permanentemente.',
      )
    ) {
      try {
        await api.profiles.emptyTrash();
        setItems([]);
        setSelectedIds([]);
        toast.success('A lixeira foi completamente esvaziada.');
      } catch (err: any) {
        toast.error(`Falha ao esvaziar lixeira: ${err.message}`);
      }
    }
  };

  const handleRefresh = () => {
    fetchTrash();
    setSelectedIds([]);
    toast.info('Lixeira sincronizada com o banco de dados.');
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
      </div>

      {/* Erro de conexão se houver */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 p-3 text-xs text-[#FF6B6B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTrash}
            className="rounded bg-[#EF4444]/20 px-2 py-1 font-semibold hover:bg-[#EF4444]/30 text-white"
          >
            Tentar novamente
          </button>
        </div>
      )}

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

      {/* Tabela de Itens Excluídos ou Loader */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-[#3E404D] bg-[#24252B]">
          <div className="flex flex-col items-center gap-2 text-xs text-[#8E92A2]">
            <Loader2 className="animate-spin text-[#DFE104]" size={24} />
            <span>Carregando itens da lixeira...</span>
          </div>
        </div>
      ) : (
        <TabelaLixeira
          items={filteredItems}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          onRestore={handleRestore}
          onDeletePermanent={handleDeletePermanent}
        />
      )}
    </div>
  );
};

export default LixeiraPage;
