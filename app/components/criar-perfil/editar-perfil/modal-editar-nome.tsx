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
      <label className="mb-2 block text-[13px] font-semibold text-slate-800 dark:text-[#A6A9B6]">
        Nome do Perfil
      </label>
      <input
        type="text"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        autoFocus
        disabled={isSaving}
        placeholder="Digite o novo nome do perfil..."
        className="h-10 w-full rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#24252A] px-3.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A6A9B6] transition-colors focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none shadow-xs disabled:opacity-50"
      />
    </ModalBase>
  );
};

export default ModalEditarNome;
