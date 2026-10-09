import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Trash2, Tag as TagIcon, Pencil, Check, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { TagItem, serviceTags } from '../../services/tags/service.tags';
import { ModalNovaEtiqueta } from './modal-nova-etiqueta';
import { TagBadge } from './tag-badge';
import { Checkbox } from '../ui/checkbox';
import { api } from '@/services/index.api';

interface ModalEditarTagsPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdated?: (updatedProfile: any) => void;
}

export const ModalEditarTagsPerfil: React.FC<ModalEditarTagsPerfilProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Submodal para criar/editar etiqueta no sistema
  const [isSubmodalOpen, setIsSubmodalOpen] = useState(false);
  const [tagEmEdicao, setTagEmEdicao] = useState<TagItem | null>(null);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const res = await serviceTags.list();
      setTags(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Erro ao buscar etiquetas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && profile) {
      fetchTags();
      setSearchQuery('');

      // Normaliza as tags atuais do perfil
      const currentTags = Array.isArray(profile.tags)
        ? (profile.tags as any[]).map((t: any) => typeof t === 'string' ? t : t?.name || '').filter(Boolean)
        : typeof profile.tags === 'string'
          ? profile.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [];
      setProfileTags(currentTags);
    }
  }, [isOpen, profile]);

  // Alterna uma etiqueta no perfil (adiciona ou remove)
  const handleToggleTag = (tagName: string) => {
    setProfileTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName],
    );
  };

  // Salvar nova tag ou edição no catálogo do sistema
  const handleSaveTag = async (data: { id?: string | number; name: string; color: string }) => {
    if (data.id) {
      await serviceTags.update(data.id, { name: data.name, color: data.color });
    } else {
      await serviceTags.create({ name: data.name, color: data.color });
      // Se for uma nova etiqueta criada, adiciona automaticamente ao perfil
      if (!profileTags.includes(data.name)) {
        setProfileTags((prev) => [...prev, data.name]);
      }
    }
    await fetchTags();
  };

  // Excluir tag individual do catálogo
  const handleDeleteSingle = async (tag: TagItem) => {
    if (!confirm(`Excluir a etiqueta "${tag.name}" do sistema?`)) return;
    try {
      setIsLoading(true);
      await serviceTags.delete(tag.id);
      setProfileTags((prev) => prev.filter((t) => t !== tag.name));
      await fetchTags();
      toast.success('Etiqueta excluída');
    } catch (err: any) {
      toast.error(`Erro ao excluir etiqueta: ${err.message || 'Falha na exclusão'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar alterações de tags no perfil
  const handleSaveProfileTags = async () => {
    if (!profile) return;
    try {
      setIsSaving(true);
      await api.profiles.update(String(profile.id), {
        tags: profileTags,
      });

      const updated = {
        ...profile,
        tags: profileTags,
      };

      onProfileUpdated?.(updated);
      toast.success(`Etiquetas do perfil "${profile.name}" atualizadas!`);
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao salvar etiquetas: ${err.message || 'Falha na comunicação'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtragem da lista pela busca
  const filteredTags = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  if (!isOpen || !profile) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 dark:bg-black/70 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[680px] min-h-[520px] rounded-2xl border border-slate-200 dark:border-[#303241]/90 bg-white dark:bg-[#1A1C24] shadow-2xl dark:shadow-black/90 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Toolbar de Ações com botão fechar */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-[#2C2E3B]/70 bg-slate-50 dark:bg-[#16171E]/60 shrink-0">
          <div className="flex items-center gap-3 flex-1">
            {/* Botão Nova Etiqueta */}
            <button
              type="button"
              onClick={() => {
                setTagEmEdicao(null);
                setIsSubmodalOpen(true);
              }}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#00FF66] dark:hover:bg-[#00D655] dark:text-black px-4 text-xs font-bold shadow-md shadow-emerald-600/20 dark:shadow-[#00FF66]/10 transition-all active:scale-[0.98] shrink-0"
            >
              <TagIcon size={13} className="text-white dark:text-black" />
              <span>Nova Etiqueta</span>
            </button>

            {/* Input de Busca */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#6C7082] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar etiqueta..."
                className="h-9 w-full rounded-lg border border-slate-300 dark:border-[#303241]/80 bg-white dark:bg-[#14151B] pl-9 pr-3 text-xs text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#585B6A] focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-hidden transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#8E92A2] dark:hover:bg-[#2A2C38] dark:hover:text-white transition-colors shrink-0"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumo das Etiquetas Ativas no Perfil */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#2C2E3B]/70 bg-slate-50/80 dark:bg-[#14151D]/90 flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-600 dark:text-[#8E92A2] font-medium mr-1 select-none">
            Etiquetas no perfil:
          </span>
          {profileTags.length === 0 ? (
            <span className="text-xs text-slate-400 dark:text-[#585B6A] italic select-none">
              Nenhuma etiqueta atribuída. Selecione abaixo para adicionar.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {profileTags.map((tag) => (
                <TagBadge
                  key={tag}
                  name={tag}
                  color={serviceTags.getColorByName(tag)}
                  onRemove={() => handleToggleTag(tag)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tabela de Etiquetas do Sistema */}
        <div className="flex-1 overflow-y-auto">
          {/* Cabeçalho da Tabela */}
          <div className="flex items-center border-b border-slate-200 dark:border-[#2C2E3B] bg-slate-100 dark:bg-[#171821] px-6 py-2.5 text-xs font-semibold text-slate-600 dark:text-[#8E92A2] select-none sticky top-0 z-10">
            <div className="w-9 flex items-center">
              <span className="text-[11px] text-slate-400 dark:text-[#717585]">#</span>
            </div>
            <div className="flex-1 tracking-wider uppercase text-[11px] text-slate-500 dark:text-[#717585]">
              Etiqueta (Clique para adicionar/remover)
            </div>
            <div className="w-36 text-center tracking-wider uppercase text-[11px] text-slate-500 dark:text-[#717585]">
              Status no Perfil
            </div>
            <div className="w-20 text-right pr-2 tracking-wider uppercase text-[11px] text-slate-500 dark:text-[#717585]">
              Ações
            </div>
          </div>

          {/* Linhas ou Estado Vazio */}
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-[#6C7082] select-none">
              <TagIcon size={28} className="text-slate-300 dark:text-[#363847] mb-2" />
              <p className="text-xs">
                {isLoading ? 'Carregando etiquetas...' : 'Nenhuma etiqueta encontrada'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2C2E3B]/40">
              {filteredTags.map((tag) => {
                const isAssigned = profileTags.includes(tag.name);

                return (
                  <div
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.name)}
                    className={`flex items-center px-6 py-3 text-xs transition-colors cursor-pointer select-none group ${isAssigned
                        ? 'bg-emerald-50/70 hover:bg-emerald-50 dark:bg-[#00FF66]/10 dark:hover:bg-[#00FF66]/15'
                        : 'hover:bg-slate-50 dark:hover:bg-[#232532]/70'
                      }`}
                  >
                    {/* Checkbox de seleção para o perfil */}
                    <div className="w-9 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isAssigned}
                        onChange={() => handleToggleTag(tag.name)}
                      />
                    </div>

                    {/* Badge / Nome */}
                    <div className="flex-1 flex items-center gap-2.5">
                      <TagBadge name={tag.name} color={tag.color} />
                    </div>

                    {/* Status no Perfil */}
                    <div className="w-36 flex items-center justify-center">
                      {isAssigned ? (
                        <span className="flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-[#00FF66]/20 px-2 py-0.5 text-[10px] dark:text-[#00FF66] font-bold border dark:border-[#00FF66]/40">
                          <Check size={10} strokeWidth={3} /> Atribuída
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-600 dark:text-[#585B6A] dark:group-hover:text-[#9093A2] transition-colors">
                          Clique para atribuir
                        </span>
                      )}
                    </div>

                    {/* Ações no catálogo do sistema */}
                    <div
                      className="w-20 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTagEmEdicao(tag);
                          setIsSubmodalOpen(true);
                        }}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-[#8E92A2] dark:hover:bg-[#2C2E3B] dark:hover:text-[#00FF66] transition-colors"
                        title="Editar etiqueta no sistema"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(tag)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-[#8E92A2] dark:hover:bg-[#FF4D4F]/15 dark:hover:text-[#FF4D4F] transition-colors"
                        title="Excluir etiqueta do sistema"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#2C2E3B]/80 px-6 py-4 bg-slate-50 dark:bg-[#16171E]/70 shrink-0">
          <div className="text-xs text-slate-600 dark:text-[#8E92A2]">
            <span className="font-semibold text-slate-900 dark:text-white">{profileTags.length}</span> etiqueta(s) selecionada(s)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-[#9093A2] dark:hover:bg-[#2A2C38] dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveProfileTags}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#00FF66] dark:hover:bg-[#00D655] text-xs font-bold dark:text-black transition-all cursor-pointer shadow-md shadow-emerald-600/20 dark:shadow-[#00FF66]/10 active:scale-[0.98]"
            >
              {isSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={14} strokeWidth={2.5} />
              )}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submodal Nova/Editar Etiqueta */}
      <ModalNovaEtiqueta
        isOpen={isSubmodalOpen}
        onClose={() => {
          setIsSubmodalOpen(false);
          setTagEmEdicao(null);
        }}
        onSave={handleSaveTag}
        tagParaEditar={tagEmEdicao}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ModalEditarTagsPerfil;
