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
      maxWidth="max-w-[620px]"
    >
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[13px] font-semibold text-slate-800 dark:text-[#A6A9B6]">
          Observação do perfil: <span className="font-bold text-[#7C3AED] dark:text-[#A78BFA]">{profile?.name}</span>
        </label>
        <span className="text-xs text-slate-400 dark:text-[#A6A9B6]">
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
        className="w-full rounded-xl border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#24252A] p-3 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A6A9B6] transition-colors focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-none shadow-xs resize-none leading-relaxed disabled:opacity-50"
      />
    </ModalBase>
  );
};

export default ModalEditarObservacao;
