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
import { serviceSync } from '@/services/sync/service.sync';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { serviceNotifications } from '@/services/notifications/service.notifications';
import { useAuth } from '@/contexts/auth-context';
import {
  wsService,
  ProfileStatusData,
  ProfileSyncingData,
  ProfileSyncedData,
  ProfileSyncFailedData,
} from '@/services/ws/service.ws';

export const PerfisPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos os grupos');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [editingTagsProfile, setEditingTagsProfile] = useState<any | null>(null);
  const [editingNotesProfile, setEditingNotesProfile] = useState<any | null>(null);

  // Carrega perfis reais do backend local sem desmontar o DOM nas atualizações
  const hasLoadedOnce = useRef(false);
  const fetchProfiles = useCallback(async (forceLoader = false) => {
    try {
      if (forceLoader || !hasLoadedOnce.current) {
        setIsLoading(true);
      }
      setError(null);
      serviceTags.list().catch(() => { });
      const data = await api.profiles.list(searchQuery, selectedGroup);
      const list = Array.isArray(data) ? data : [];
      setProfiles(list);
      serviceTags.registerColors(list.flatMap((p: any) => p.tags || []));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar perfis do backend local.');
    } finally {
      hasLoadedOnce.current = true;
      setIsLoading(false);
    }
  }, [searchQuery, selectedGroup]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Assina o estado global de sincronização do serviceSync para acionar o spinner
  useEffect(() => {
    return serviceSync.subscribeSyncState((syncing) => {
      setIsSyncingCloud(syncing);
    });
  }, []);

  // Dupla Troca inteligente automática ao abrir a página se autenticado
  const hasAutoSynced = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || hasAutoSynced.current) return;
    hasAutoSynced.current = true;

    serviceSync.syncProfiles(() => {
      fetchProfiles(false);
    }).catch((err) => {
      console.warn('Falha na sincronização automática em segundo plano:', err);
    });
  }, [fetchProfiles, isAuthenticated]);

  const handleRefresh = useCallback(() => {
    serviceSync.syncProfiles(() => {
      fetchProfiles(false);
    }).catch(() => {
      fetchProfiles(false);
    });
  }, [fetchProfiles]);

  // WebSocket em tempo real via Hub wsService centralizado (zero polling, zero conexões duplicadas)
  useEffect(() => {
    const unsubs = [
      wsService.subscribe<ProfileStatusData>('profile_status', (data) => {
        if (!data) return;
        const { profile_id, status } = data;
        const isRunning = status === 'running';
        setProfiles((prev) =>
          prev.map((curr) =>
            String(curr.id) === String(profile_id)
              ? { ...curr, status, isRunning, isStarting: false }
              : curr,
          ),
        );
      }),

      wsService.subscribe<ProfileSyncingData>('profile_syncing', (data) => {
        if (!data) return;
        const { profile_id } = data;
        setProfiles((prev) =>
          prev.map((curr) =>
            String(curr.id) === String(profile_id)
              ? { ...curr, isSyncing: true }
              : curr,
          ),
        );
        setTimeout(() => {
          setProfiles((prev) =>
            prev.map((curr) =>
              String(curr.id) === String(profile_id) && curr.isSyncing
                ? { ...curr, isSyncing: false }
                : curr,
            ),
          );
        }, 8000);
      }),

      wsService.subscribe<ProfileSyncedData>('profile_synced', (data) => {
        if (!data) return;
        const { profile_id, size_kb } = data;
        setProfiles((prev) =>
          prev.map((curr) =>
            String(curr.id) === String(profile_id)
              ? {
                ...curr,
                isSyncing: false,
                cloud_synced: true,
                cloudSizeKb: size_kb,
              }
              : curr,
          ),
        );
      }),

      wsService.subscribe<ProfileSyncFailedData>('profile_sync_failed', (data) => {
        if (!data) return;
        const { profile_id } = data;
        setProfiles((prev) =>
          prev.map((curr) =>
            String(curr.id) === String(profile_id)
              ? { ...curr, isSyncing: false }
              : curr,
          ),
        );
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [fetchProfiles]);

  // Filter logic
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const tagNames = Array.isArray(p.tags)
        ? p.tags.map((t: any) => (typeof t === 'string' ? t : t?.name || '')).filter(Boolean)
        : typeof p.tags === 'string'
          ? (p.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
          : [];

      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && String(p.id).toLowerCase().includes(q)) ||
        (p.ip && p.ip.toLowerCase().includes(q)) ||
        (p.proxy?.host && p.proxy.host.toLowerCase().includes(q)) ||
        tagNames.some((t: string) => t.toLowerCase().includes(q));

      const matchesGroup =
        selectedGroup === 'Todos os grupos' || p.group === selectedGroup;

      const matchesTag =
        selectedTag === null || tagNames.includes(selectedTag);

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

  // Iniciar / Parar toggle assíncrono e não-bloqueante
  const handleToggleRunning = async (id: string | number) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;

    const isCurrentlyRunning = target.status === 'running' || target.isRunning;
    const isCurrentlyStarting = Boolean(target.isStarting || target.status === 'starting');

    // Evita cliques duplos enquanto já estiver iniciando
    if (isCurrentlyStarting) return;

    if (!isCurrentlyRunning) {
      // 1. Marca imediatamente como iniciando apenas nesta linha (sem travar a tela)
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, isStarting: true, status: 'starting' } : p,
        ),
      );

      // 2. Dispara a requisição em background
      api.profiles
        .launch(String(id))
        .then((res) => {
          if (res && res.profile) {
            setProfiles((prev) =>
              prev.map((p) =>
                p.id === id
                  ? { ...p, ...res.profile, isStarting: false, isRunning: true, status: 'running' }
                  : p,
              ),
            );
          }
        })
        .catch((err: any) => {
          console.warn('⚠️ Falha ao iniciar perfil:', err);
          // Restaura o estado para pronto silenciosamente sem modais intrusivos
          setProfiles((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, isStarting: false, isRunning: false, status: 'ready' }
                : p,
            ),
          );
          // Adiciona notificação na central do Header com destaque para bloqueio de antivírus
          const isAntivirus = typeof err?.message === 'string' && (err.message.includes('Windows Defender') || err.message.includes('Antivírus'));
          serviceNotifications.add({
            title: isAntivirus ? `🛡️ Bloqueio de Antivírus: "${target.name || 'Perfil'}"` : `Falha ao Iniciar "${target.name || 'Perfil'}"`,
            description: err?.message || 'Erro ao inicializar o motor do navegador.',
            type: 'error',
          });
        });
    } else {
      // Parar perfil
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, isRunning: false, isStarting: false, status: 'ready' } : p,
        ),
      );
      try {
        await api.profiles.stop(String(id));
      } catch (err: any) {
        console.error('Erro ao parar perfil:', err);
      }
    }
  };

  // Start selected de forma assíncrona com leve escalonamento
  const handleStartSelected = async () => {
    const toStart = [...selectedIds];
    setSelectedIds([]);
    for (const id of toStart) {
      handleToggleRunning(id);
      await new Promise((r) => setTimeout(r, 150));
    }
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
        onRefresh={handleRefresh}
        onOpenTagFilter={() => setIsTagModalOpen(true)}
        onStartSelected={handleStartSelected}
        onStopSelected={handleStopSelected}
        onDeleteSelected={handleDeleteSelected}
        isSyncing={isSyncingCloud}
      />

      {/* Indicador de Filtro por Etiqueta Ativo */}
      {selectedTag && (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] px-3 py-1.5 text-xs shrink-0 select-none shadow-xs">
          <span className="text-slate-500 dark:text-[#90909D]">Filtro ativo por etiqueta:</span>
          <TagBadge
            name={selectedTag}
            color={serviceTags.getColorByName(selectedTag)}
            onRemove={() => setSelectedTag(null)}
          />
        </div>
      )}

      {/* Alerta de erro de comunicação */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-500 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchProfiles(true)}
            className="cursor-pointer font-semibold underline hover:text-red-600 dark:hover:text-red-300"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Tabela de dados */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] shadow-xs">
          <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-[#90909D]">
            <Loader2 size={28} className="animate-spin text-emerald-600 dark:text-[#00FF66]" />
            <span className="text-xs font-medium">Carregando perfis do banco local...</span>
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
          isSyncing={isSyncingCloud}
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
