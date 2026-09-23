import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderTabela } from '@/components/perfis/headerTabela';
import { Tabela } from '@/components/perfis/tabela';
import { api } from '@/services/api';
import { X, Check, Loader2 } from 'lucide-react';

export const PerfisPage: React.FC = () => {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos os grupos');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [isRpaActive, setIsRpaActive] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [editNameInput, setEditNameInput] = useState('');

  // Carrega perfis reais do backend local SQLite
  const fetchProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.profiles.list(searchQuery, selectedGroup);
      setProfiles(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar perfis do banco local.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedGroup]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Filter logic
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.ip && p.ip.toLowerCase().includes(q)) ||
        (p.tags &&
          p.tags.some((t: string) => t.toLowerCase().includes(q)));

      const matchesGroup =
        selectedGroup === 'Todos os grupos' || p.group === selectedGroup;

      const matchesTag =
        selectedTag === null || (p.tags && p.tags.includes(selectedTag));

      return matchesSearch && matchesGroup && matchesTag;
    });
  }, [profiles, searchQuery, selectedGroup, selectedTag]);

  // Select item toggle
  const handleSelectProfile = (id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Select all toggle
  const handleSelectAll = () => {
    const isAll =
      filteredProfiles.length > 0 &&
      filteredProfiles.every((p) => selectedIds.includes(p.id));

    if (isAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProfiles.map((p) => p.id));
    }
  };

  // Iniciar / Parar toggle
  const handleToggleRunning = async (id: string | number) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;

    if (!target.isRunning) {
      // Iniciar navegador
      try {
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isRunning: true } : p)),
        );
        await api.profiles.launch(String(id));
      } catch (err: any) {
        alert(`Falha ao iniciar o perfil: ${err.message}`);
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isRunning: false } : p)),
        );
      }
    } else {
      // Parar perfil
      try {
        await api.profiles.update(String(id), { status: 'ready' });
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isRunning: false } : p)),
        );
      } catch (err: any) {
        console.error('Erro ao parar perfil:', err);
      }
    }
  };

  // Start selected
  const handleStartSelected = async () => {
    for (const id of selectedIds) {
      try {
        await api.profiles.launch(String(id));
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfiles();
  };

  // Stop selected
  const handleStopSelected = async () => {
    for (const id of selectedIds) {
      try {
        await api.profiles.update(String(id), { status: 'ready' });
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfiles();
  };

  // Delete selected
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      confirm(`Deseja excluir os ${selectedIds.length} perfis selecionados do banco de dados?`)
    ) {
      try {
        await Promise.all(selectedIds.map((id) => api.profiles.delete(String(id))));
        setProfiles((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setSelectedIds([]);
      } catch (err: any) {
        alert(`Erro ao excluir perfis: ${err.message}`);
      }
    }
  };

  // Single Delete
  const handleDelete = async (id: string | number) => {
    const target = profiles.find((p) => p.id === id);
    if (confirm(`Excluir permanentemente o perfil "${target?.name}"?`)) {
      try {
        await api.profiles.delete(String(id));
        setProfiles((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      } catch (err: any) {
        alert(`Erro ao excluir perfil: ${err.message}`);
      }
    }
  };

  // Start edit modal
  const handleOpenEdit = (profile: any) => {
    setEditingProfile(profile);
    setEditNameInput(profile.name);
  };

  // Save edit modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editNameInput.trim()) return;

    try {
      await api.profiles.update(String(editingProfile.id), {
        name: editNameInput.trim(),
      });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editingProfile.id
            ? { ...p, name: editNameInput.trim() }
            : p,
        ),
      );
      setEditingProfile(null);
    } catch (err: any) {
      alert(`Erro ao renomear perfil: ${err.message}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* Controles desenhados diretamente na página sem container */}
      <HeaderTabela
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        selectedIds={selectedIds}
        profiles={profiles}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        isSyncActive={isSyncActive}
        onToggleSync={() => setIsSyncActive((prev) => !prev)}
        isRpaActive={isRpaActive}
        onToggleRpa={() => setIsRpaActive((prev) => !prev)}
        onNewProfile={() => navigate('/criar-perfil')}
        onRefresh={fetchProfiles}
        onStartSelected={handleStartSelected}
        onStopSelected={handleStopSelected}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* Tabela de dados */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-[#3E404D] bg-[#24252B]">
          <div className="flex flex-col items-center gap-2 text-[#9093A2]">
            <Loader2 size={28} className="animate-spin text-[#DFE104]" />
            <span className="text-xs">Carregando perfis do banco local...</span>
          </div>
        </div>
      ) : (
        <Tabela
          profiles={filteredProfiles}
          selectedIds={selectedIds}
          onSelectProfile={handleSelectProfile}
          onSelectAll={handleSelectAll}
          onToggleRunning={handleToggleRunning}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Modal de Edição Rápida */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="animate-in zoom-in-95 w-full max-w-md rounded-xl border border-[#262837] bg-[#12131b] p-5 shadow-2xl duration-150">
            <div className="flex items-center justify-between border-b border-[#202230] pb-3">
              <h3 className="text-sm font-semibold text-[#F4F4F6]">
                Editar Nome do Perfil
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="rounded-md p-1 text-[#6c7084] hover:bg-[#1a1c27] hover:text-[#F4F4F6]"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#9093A2]">
                  Nome do Perfil
                </label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-[#2a2d3e] bg-[#171923] px-3 py-2 text-xs text-[#F4F4F6] focus:border-[#DFE104] focus:ring-1 focus:ring-[#DFE104] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#9093A2] transition-colors hover:bg-[#1b1d28] hover:text-[#F4F4F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-[#DFE104] px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#C5C702]"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Salvar Alteração</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfisPage;
