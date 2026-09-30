import React, { useState, useEffect } from 'react';
import { api } from '@/services/index.api';
import { toast } from '@/components/ui/notification';
import { ModalBase } from './modal-base';

export interface ModalEditarNomeProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdated?: (updatedProfile: any) => void;
}

export const ModalEditarNome: React.FC<ModalEditarNomeProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && profile) setNameInput(profile.name || '');
  }, [isOpen, profile]);

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !profile) return;

    try {
      setIsSaving(true);
      await api.profiles.update(String(profile.id), { name: trimmed });
      toast.success('Perfil renomeado com sucesso');
      onProfileUpdated?.({ ...profile, name: trimmed });
      onClose();
    } catch (err: any) {
      toast.error('Erro ao renomear perfil: ' + (err?.message || 'Falha'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalBase
      isOpen={isOpen && !!profile}
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      isSaveDisabled={!nameInput.trim()}
    >
      <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-[#B0B4C3]">
        Nome do Perfil
      </label>
      <input
        type="text"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        autoFocus
        disabled={isSaving}
        placeholder="Digite o novo nome do perfil..."
        className="h-11 w-full rounded-xl border border-slate-200 dark:border-[#363948] bg-slate-50 dark:bg-[#14151C] px-4 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder-slate-400 dark:placeholder-[#5E6274] transition-all hover:border-slate-300 dark:hover:border-[#4B5065] focus:border-emerald-500 dark:focus:border-white/60 focus:ring-2 focus:ring-emerald-500/15 dark:focus:ring-white/15 focus:outline-hidden disabled:opacity-50"
      />
    </ModalBase>
  );
};

export default ModalEditarNome;
