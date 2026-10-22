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
        <label className="text-sm font-semibold text-slate-800 dark:text-[#B0B4C3]">
          Observação do perfil: <span className="font-bold text-emerald-600 dark:text-[#00FF66]">{profile?.name}</span>
        </label>
        <span className="text-xs text-slate-400 dark:text-[#7C8092]">
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
        className="w-full rounded-xl border border-slate-200 dark:border-[#363948] bg-slate-50 dark:bg-[#14151C] p-4 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder-slate-400 dark:placeholder-[#5E6274] transition-all hover:border-slate-300 dark:hover:border-[#4B5065] focus:border-emerald-500 dark:focus:border-white/60 focus:ring-2 focus:ring-emerald-500/15 dark:focus:ring-white/15 focus:outline-hidden resize-none leading-relaxed disabled:opacity-50"
      />
    </ModalBase>
  );
};

export default ModalEditarObservacao;
