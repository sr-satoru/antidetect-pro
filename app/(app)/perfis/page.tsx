import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderTabela } from '@/components/perfis/headerTabela';
import { Tabela } from '@/components/perfis/tabela';
import { ModalEtiquetas } from '@/components/tags/modal-etiquetas';
import { ModalEditarTagsPerfil } from '@/components/tags/modal-editar-tags-perfil';
import { ModalEditarNome, ModalEditarObservacao } from '@/components/criar-perfil/editar-perfil';
import { TagBadge } from '@/components/tags/tag-badge';
import { serviceTags } from '@/services/tags/service.tags';
import { api } from '@/services/index.api';
import { servicePerfis } from '@/services/perfis/service.perfis';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { useBrowser } from '@/contexts/browser-context';
import { WS_BASE_URL } from '@/services/http';

export const PerfisPage: React.FC = () => {
  const navigate = useNavigate();
  const { openModal } = useBrowser();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos os grupos');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [editingTagsProfile, setEditingTagsProfile] = useState<any | null>(null);
  const [editingNotesProfile, setEditingNotesProfile] = useState<any | null>(null);

  // Carrega perfis reais do backend local
  const fetchProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      serviceTags.list().catch(() => {});
      const data = await api.profiles.list(searchQuery, selectedGroup);
      const list = Array.isArray(data) ? data : [];
      setProfiles(list);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar perfis do backend local.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedGroup]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Dupla Troca automática com a nuvem (Download de ausentes + Upload/LWW de locais) ao abrir a página
  const hasAutoSynced = useRef(false);
  useEffect(() => {
    const token = localStorage.getItem('star_auth_token');
    if (!token || hasAutoSynced.current) return;
    hasAutoSynced.current = true;

    servicePerfis
      .twoWaySync()
      .then((res: any) => {
        if (!res) return;
        const downloaded = res.downloaded_count || 0;
        const uploaded = res.uploaded_count || 0;
        const skipped = res.skipped_running || 0;

        if (downloaded > 0 && uploaded > 0) {
          toast.success(
            `☁️ Dupla Troca: ${downloaded} baixado(s) da nuvem e ${uploaded} enviado(s)!`,
          );
        } else if (downloaded > 0) {
          toast.success(
            `☁️ ${downloaded} perfil(is) baixado(s) e restaurado(s) da nuvem!`,
          );
        } else if (uploaded > 0) {
          toast.success(
            `☁️ ${uploaded} perfil(is) novo(s) enviado(s) para a nuvem!`,
          );
        }

        if (skipped > 0) {
          toast.info(
            `ℹ️ ${skipped} perfil(is) em execução localmente serão sincronizados ao fechar.`,
          );
        }

        if (downloaded > 0 || uploaded > 0) {
          fetchProfiles();
        }
      })
      .catch((err) => {
        console.warn('Falha na Dupla Troca automática em segundo plano:', err);
      });
  }, [fetchProfiles]);


  // WebSocket em tempo real: zero polling, atualização instantânea quando o Camoufox for fechado pelo 'X'
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      try {
        const wsUrl = WS_BASE_URL;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('⚡ Conectado ao WebSocket do Star Multlogin Backend:', ws?.url);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'profile_status' && msg.data) {
              const { profile_id, status } = msg.data;
              console.log('⚡ WebSocket profile_status recebido:', { profile_id, status });
              const isRunning = status === 'running';
              setProfiles((prev) =>
                prev.map((curr) =>
                  String(curr.id) === String(profile_id)
                    ? { ...curr, status, isRunning }
                    : curr,
                ),
              );
            } else if (msg.event === 'profile_syncing' && msg.data) {
              const { profile_id } = msg.data;
              console.log('🔄 WebSocket profile_syncing recebido:', profile_id);
              setProfiles((prev) =>
                prev.map((curr) =>
                  String(curr.id) === String(profile_id)
                    ? { ...curr, isSyncing: true }
                    : curr,
                ),
              );
              // Watchdog de segurança: garante que o perfil destrava após 8s mesmo em falhas de rede silenciosas
              setTimeout(() => {
                setProfiles((prev) =>
                  prev.map((curr) =>
                    String(curr.id) === String(profile_id) && curr.isSyncing
                      ? { ...curr, isSyncing: false }
                      : curr,
                  ),
                );
              }, 8000);
            } else if (msg.event === 'profile_synced' && msg.data) {
              const { profile_id, size_kb } = msg.data;
              console.log('✅ WebSocket profile_synced recebido:', { profile_id, size_kb });
              setProfiles((prev) => {
                const exists = prev.some((curr) => String(curr.id) === String(profile_id));
                if (!exists) {
                  fetchProfiles();
                  return prev;
                }
                return prev.map((curr) =>
                  String(curr.id) === String(profile_id)
                    ? {
                        ...curr,
                        isSyncing: false,
                        cloud_synced: true,
                        cloudSizeKb: size_kb,
                      }
                    : curr,
                );
              });
            } else if (msg.event === 'profile_sync_failed' && msg.data) {
              const { profile_id, error } = msg.data;
              console.warn('⚠️ WebSocket profile_sync_failed recebido:', { profile_id, error });
              setProfiles((prev) =>
                prev.map((curr) =>
                  String(curr.id) === String(profile_id)
                    ? { ...curr, isSyncing: false }
                    : curr,
                ),
              );
            }
          } catch (err) {
            console.error('Erro ao processar mensagem do WebSocket:', err);
          }
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Filter logic
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.ip && p.ip.toLowerCase().includes(q)) ||
        (p.proxy?.host && p.proxy.host.toLowerCase().includes(q)) ||
        (Array.isArray(p.tags) &&
          p.tags.some((t: string) => typeof t === 'string' && t.toLowerCase().includes(q)));

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

    const isCurrentlyRunning = target.status === 'running' || target.isRunning;

    if (!isCurrentlyRunning) {
      // Iniciar navegador
      try {
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isRunning: true, status: 'running' } : p)),
        );
        const res = await api.profiles.launch(String(id));
        if (res && res.profile) {
          setProfiles((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...res.profile, isRunning: true, status: 'running' } : p)),
          );
        }
      } catch (err: any) {
        toast.error(`Falha ao iniciar o perfil: ${err.message}`);
        if (
          err.message?.includes('motor') ||
          err.message?.includes('instalado') ||
          err.message?.includes('Baixar Cliente')
        ) {
          openModal();
        }
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isRunning: false, status: 'ready' } : p)),
        );
      }
    } else {
      // Parar perfil
      try {
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isRunning: false, status: 'ready' } : p)),
        );
        await api.profiles.stop(String(id));
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
        await api.profiles.stop(String(id));
      } catch (err) {
        console.error(err);
      }
    }
    fetchProfiles();
  };

  // Delete selected (move to trash)
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      confirm(`Deseja mover os ${selectedIds.length} perfis selecionados para a lixeira?`)
    ) {
      try {
        await Promise.all(selectedIds.map((id) => api.profiles.delete(String(id))));
        setProfiles((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        toast.success('Perfis movidos para a lixeira');
      } catch (err: any) {
        toast.error('Erro ao mover perfis para a lixeira');
      }
    }
  };

  // Single Delete (move to trash)
  const handleDelete = async (id: string | number) => {
    const target = profiles.find((p) => p.id === id);
    if (confirm(`Mover o perfil "${target?.name}" para a lixeira?`)) {
      try {
        await api.profiles.delete(String(id));
        setProfiles((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        toast.success('Perfil movido para a lixeira');
      } catch (err: any) {
        toast.error('Erro ao mover perfil para a lixeira');
      }
    }
  };

  // Abrir modal de renomear rápido
  const handleOpenEdit = (profile: any) => {
    setEditingProfile(profile);
  };

  // Duplicar perfil (Copiar atômico no backend / disco)
  const handleDuplicate = async (profile: any) => {
    try {
      setIsLoading(true);
      await api.profiles.clone(profile.id);
      await fetchProfiles();
      toast.success('Perfil duplicado com sucesso');
    } catch (err: any) {
      toast.error('Erro ao duplicar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir modal de edição rápida de observação
  const handleOpenEditNotes = (profile: any) => {
    setEditingNotesProfile(profile);
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
        onNewProfile={() => navigate('/criar-perfil')}
        onRefresh={fetchProfiles}
        onOpenTagFilter={() => setIsTagModalOpen(true)}
        onStartSelected={handleStartSelected}
        onStopSelected={handleStopSelected}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* Indicador de Filtro por Etiqueta Ativo */}
      {selectedTag && (
        <div className="flex items-center gap-2 rounded-md border border-[#303241] bg-[#1A1C24] px-3 py-1.5 text-xs shrink-0 select-none">
          <span className="text-[#8E92A2]">Filtro ativo por etiqueta:</span>
          <TagBadge
            name={selectedTag}
            color={serviceTags.getColorByName(selectedTag)}
            onRemove={() => setSelectedTag(null)}
          />
        </div>
      )}

      {/* Alerta de erro de comunicação */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchProfiles}
            className="cursor-pointer font-semibold underline hover:text-red-300"
          >
            Tentar novamente
          </button>
        </div>
      )}

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
          onEditTags={(profile) => setEditingTagsProfile(profile)}
          onEditNotes={handleOpenEditNotes}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Modal Dedicado de Edição Rápida de Nome */}
      <ModalEditarNome
        isOpen={Boolean(editingProfile)}
        onClose={() => setEditingProfile(null)}
        profile={editingProfile}
        onProfileUpdated={(updatedProfile) => {
          setProfiles((prev) =>
            prev.map((p) => (p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p))
          );
        }}
      />

      {/* Modal Dedicado de Edição de Observação */}
      <ModalEditarObservacao
        isOpen={Boolean(editingNotesProfile)}
        onClose={() => setEditingNotesProfile(null)}
        profile={editingNotesProfile}
        onProfileUpdated={(updatedProfile) => {
          setProfiles((prev) =>
            prev.map((p) => (p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p))
          );
        }}
      />

      {/* Modal Principal de Gestão e Filtro de Etiquetas */}
      <ModalEtiquetas
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        selectedTagFilter={selectedTag}
        onSelectTagFilter={setSelectedTag}
        onTagsUpdated={fetchProfiles}
      />

      {/* Modal Dedicado para Editar Tags do Perfil */}
      <ModalEditarTagsPerfil
        isOpen={Boolean(editingTagsProfile)}
        onClose={() => setEditingTagsProfile(null)}
        profile={editingTagsProfile}
        onProfileUpdated={(updatedProfile) => {
          setProfiles((prev) =>
            prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p))
          );
        }}
      />
    </div>
  );
};

export default PerfisPage;
