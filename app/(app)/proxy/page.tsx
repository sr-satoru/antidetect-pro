import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TabelasProxies } from '@/components/proxy/tabelas-proxies';
import { api } from '@/services/index.api';
import {
  Search,
  Plus,
  RotateCw,
  Trash2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';

export const ProxyPage: React.FC = () => {
  const [proxies, setProxies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<any | null>(null);

  // Busca lista de proxies no SQLite local
  const fetchProxies = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.proxies.list();
      setProxies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Erro ao carregar proxies:', err);
      setProxies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  // Filter logic
  const filteredProxies = useMemo(() => {
    return proxies.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.host && p.host.toLowerCase().includes(q)) ||
        (p.ip && p.ip.toLowerCase().includes(q)) ||
        (p.country && p.country.toLowerCase().includes(q)) ||
        (p.user && p.user.toLowerCase().includes(q));

      const matchesType =
        selectedType === 'all' ||
        (p.type && p.type.toLowerCase() === selectedType.toLowerCase()) ||
        (p.proxy_type && p.proxy_type.toLowerCase() === selectedType.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && p.status === 'active') ||
        (selectedStatus === 'error' && p.status === 'error');

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [proxies, searchQuery, selectedType, selectedStatus]);

  // Selection
  const handleSelectProxy = (id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    const isAll =
      filteredProxies.length > 0 &&
      filteredProxies.every((p) => selectedIds.includes(p.id));

    if (isAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProxies.map((p) => p.id));
    }
  };

  // Test handlers
  const handleTestProxy = async (id: string | number) => {
    const proxy = proxies.find((p) => p.id === id);
    if (!proxy) return;

    try {
      const res = await api.proxies.test({
        type: proxy.type || proxy.proxy_type || 'socks5',
        host: proxy.host,
        port: Number(proxy.port),
        username: proxy.user || proxy.username,
        password: proxy.pass || proxy.password,
      });

      setProxies((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
              ...p,
              status: res.status,
              ping: res.latency_ms ?? p.ping,
              ip: res.exit_ip ?? p.ip,
            }
            : p,
        ),
      );
    } catch (err: any) {
      toast.error(`Falha no teste: ${err.message}`);
    }
  };

  const handleTestSelected = async () => {
    for (const id of selectedIds) {
      await handleTestProxy(id);
    }
  };

  // Delete single proxy
  const handleDeleteProxy = async (id: string | number) => {
    const target = proxies.find((p) => p.id === id);
    if (
      confirm(
        `Deseja realmente remover o proxy "${target?.name || target?.host}"?`,
      )
    ) {
      try {
        await api.proxies.delete(id);
        setProxies((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        toast.success('Proxy excluído com sucesso');
      } catch (err: any) {
        toast.error('Erro ao excluir proxy');
      }
    }
  };

  // Delete selected
  const handleDeleteSelected = async () => {
    if (
      confirm(`Deseja excluir os ${selectedIds.length} proxies selecionados?`)
    ) {
      try {
        await Promise.all(selectedIds.map((id) => api.proxies.delete(id)));
        setProxies((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        toast.success('Proxies excluídos com sucesso');
      } catch (err: any) {
        toast.error(`Erro ao excluir proxies: ${err.message}`);
      }
    }
  };

  // Save / Update proxy
  const handleSaveProxy = async (data: any | any[]) => {
    try {
      if (Array.isArray(data)) {
        for (const item of data) {
          await api.proxies.create(item);
        }
      } else if (data.id) {
        await api.proxies.update(data.id, data);
      } else {
        await api.proxies.create(data);
      }
      setIsModalOpen(false);
      setEditingProxy(null);
      await fetchProxies();
      toast.success('Proxy salvo com sucesso');
    } catch (err: any) {
      toast.error(`Erro ao salvar proxy: ${err.message}`);
    }
  };

  const handleOpenAdd = () => {
    setEditingProxy(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proxy: any) => {
    setEditingProxy(proxy);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* Header com Filtros e Ações */}
      <div className="flex shrink-0 flex-col gap-2.5 pb-1 select-none">
        {/* Linha 1: Filtros de Tipo, Status e Busca */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro Protocolo */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 cursor-pointer appearance-none rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] pr-8 pl-3.5 text-[13px] text-slate-700 dark:text-[#E4E6EE] transition-colors hover:border-slate-300 dark:hover:border-[#606373] focus:outline-hidden shadow-xs"
            >
              <option value="all">Todos os tipos</option>
              <option value="socks5">SOCKS5</option>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
              <option value="mobile">Móvel 4G/5G</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 dark:text-[#8E92A2]"
            />
          </div>

          {/* Filtro Status */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 cursor-pointer appearance-none rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] pr-8 pl-3.5 text-[13px] text-slate-700 dark:text-[#E4E6EE] transition-colors hover:border-slate-300 dark:hover:border-[#606373] focus:outline-hidden shadow-xs"
            >
              <option value="all">Todos os status</option>
              <option value="active">Somente ativos</option>
              <option value="error">Com falha</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 dark:text-[#8E92A2]"
            />
          </div>

          {/* Input de Busca */}
          <div className="relative w-80 sm:w-96">
            <Search
              size={15}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 dark:text-[#8E92A2]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por Host, IP, País ou Nome..."
              className="h-10 w-full rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] pr-4 pl-10 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#8E92A2] transition-colors focus:border-slate-400 dark:focus:border-[#72768A] focus:outline-hidden shadow-xs"
            />
          </div>

          {/* Botão Principal: Novo Proxy */}
          {!isModalOpen && !editingProxy && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 text-[13px] font-medium shadow-xs transition-all active:scale-[0.98]"
              >
                <Plus size={16} />
                <span>Cadastrar Proxy</span>
              </button>
            </div>
          )}
        </div>

        {/* Linha 2: Ações em Lote */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleTestSelected}
            disabled={selectedIds.length === 0}
            className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] px-3.5 text-slate-700 dark:text-[#E4E6EE] text-[13px] font-medium transition-colors hover:bg-slate-50 dark:hover:bg-[#3A3B42] hover:text-slate-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40 shadow-xs"
          >
            <RotateCw size={14} />
            <span>Testar Selecionados ({selectedIds.length})</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3.5 text-red-600 dark:text-red-400 text-[13px] font-medium transition-colors hover:bg-red-100 dark:hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs"
          >
            <Trash2 size={14} />
            <span>Excluir Selecionados</span>
          </button>
        </div>
      </div>

      {/* Tabela de Proxies com Painel de Cadastro Embutido */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#28292E] shadow-xs">
          <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-[#A6A9B6]">
            <Loader2 size={28} className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]" />
            <span className="text-xs">Carregando proxies...</span>
          </div>
        </div>
      ) : (
        <TabelasProxies
          proxies={filteredProxies}
          selectedIds={selectedIds}
          onSelectProxy={handleSelectProxy}
          onSelectAll={handleSelectAll}
          onTestProxy={handleTestProxy}
          onEditProxy={handleOpenEdit}
          onDeleteProxy={handleDeleteProxy}
          isAddingOrEditing={isModalOpen}
          editingProxy={editingProxy}
          onCloseCadastro={() => {
            setIsModalOpen(false);
            setEditingProxy(null);
          }}
          onSaveCadastro={handleSaveProxy}
        />
      )}
    </div>
  );
};

export default ProxyPage;
