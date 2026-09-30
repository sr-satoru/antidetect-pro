import React, { useState, useEffect } from 'react';
import { api } from '@/services/index.api';
import { toast } from '@/components/ui/notification';
import { ModalBase } from './modal-base';

export interface ModalEditarObservacaoProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdated?: (updatedProfile: any) => void;
}

export const ModalEditarObservacao: React.FC<ModalEditarObservacaoProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [notesInput, setNotesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && profile) setNotesInput(profile.notes || '');
  }, [isOpen, profile]);

  const handleSave = async () => {
    if (!profile) return;
    const trimmed = notesInput.trim();

    try {
      setIsSaving(true);
      await api.profiles.update(String(profile.id), { notes: trimmed });
      toast.success('Observação atualizada com sucesso');
      onProfileUpdated?.({ ...profile, notes: trimmed });
      onClose();
    } catch (err: any) {
      toast.error('Erro ao salvar observação: ' + (err?.message || 'Falha'));
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
      maxWidth="max-w-[580px]"
    >
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-[#B0B4C3]">
          Observação do perfil: <span className="font-bold text-[#DFE104]">{profile?.name}</span>
        </label>
        <span className="text-xs text-[#7C8092]">
          {notesInput.length} caracteres
        </span>
      </div>
      <textarea
        value={notesInput}
        onChange={(e) => setNotesInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        }}
        autoFocus
        disabled={isSaving}
        rows={4}
        placeholder="Escreva uma observação, anotação ou nota para este perfil..."
        className="w-full rounded-xl border border-[#363948] bg-[#14151C] p-4 text-sm text-[#F0F2F8] placeholder-[#5E6274] transition-all hover:border-[#4B5065] focus:border-[#DFE104] focus:ring-2 focus:ring-[#DFE104]/25 focus:outline-hidden resize-none leading-relaxed disabled:opacity-50"
      />
    </ModalBase>
  );
};

export default ModalEditarObservacao;
