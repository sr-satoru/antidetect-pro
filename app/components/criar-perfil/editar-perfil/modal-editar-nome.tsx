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
      <label className="mb-2 block text-sm font-semibold text-[#B0B4C3]">
        Nome do Perfil
      </label>
      <input
        type="text"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        autoFocus
        disabled={isSaving}
        placeholder="Digite o novo nome do perfil..."
        className="h-11 w-full rounded-xl border border-[#363948] bg-[#14151C] px-4 text-sm text-[#F0F2F8] placeholder-[#5E6274] transition-all hover:border-[#4B5065] focus:border-[#DFE104] focus:ring-2 focus:ring-[#DFE104]/25 focus:outline-hidden disabled:opacity-50"
      />
    </ModalBase>
  );
};

export default ModalEditarNome;
