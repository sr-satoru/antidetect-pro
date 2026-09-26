import React, { useState, useEffect, useCallback } from 'react';
import {
  TabelaExtensoes,
  ExtensionItem,
  RecommendedExtension,
} from '@/components/extensoes/tabela-extensoes';
import { ModalAdicionarExtensao } from '@/components/extensoes/modal-adicionar-extensao';
import { api } from '@/services/index.api';
import { toast } from '@/components/ui/notification';

export const ExtensoesPage: React.FC = () => {
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Carrega extensões do backend SQLite local
  const fetchExtensions = useCallback(async () => {
    try {
      const data = await api.extensions.list();
      setExtensions(data);
    } catch (err) {
      console.error('Erro ao carregar extensões:', err);
    }
  }, []);

  useEffect(() => {
    fetchExtensions();
  }, [fetchExtensions]);

  const handleToggleEnabled = async (id: number) => {
    const target = extensions.find((ext) => ext.id === id);
    if (!target) return;

    const newEnabled = !target.enabled;
    // Otimistic update
    setExtensions((prev) =>
      prev.map((ext) =>
        ext.id === id ? { ...ext, enabled: newEnabled } : ext,
      ),
    );

    try {
      await api.extensions.update(id, { enabled: newEnabled });
      toast.success(newEnabled ? 'Extensão ativada' : 'Extensão desativada');
    } catch (err: any) {
      toast.error(`Erro ao alterar status da extensão: ${err.message}`);
      setExtensions((prev) =>
        prev.map((ext) =>
          ext.id === id ? { ...ext, enabled: !newEnabled } : ext,
        ),
      );
    }
  };

  const handleDeleteExtension = async (id: number) => {
    const target = extensions.find((ext) => ext.id === id);
    if (confirm(`Deseja remover a extensão "${target?.name}"?`)) {
      try {
        await api.extensions.delete(id);
        setExtensions((prev) => prev.filter((ext) => ext.id !== id));
        toast.success('Extensão removida com sucesso');
      } catch (err: any) {
        toast.error('Erro ao remover extensão');
      }
    }
  };

  const handleSaveExtension = async (data: Partial<ExtensionItem>) => {
    const payload = {
      name: data.name || 'Nova Extensão',
      iconType: data.iconType || 'custom',
      iconBg: data.iconBg || '#2F80ED',
      enabled: true,
      status: 'available',
      description:
        data.description || 'Extensão adicionada à equipe do Fury Antidetect.',
      provider: data.provider || 'Chrome Web Store',
      providerUrl: data.providerUrl || 'https://chromewebstore.google.com',
      tab: 'team',
    };

    try {
      await api.extensions.create(payload);
      setIsModalOpen(false);
      await fetchExtensions();
      toast.success('Extensão cadastrada com sucesso');
    } catch (err: any) {
      toast.error(`Erro ao cadastrar extensão: ${err.message}`);
    }
  };

  const handleAddRecommended = async (recExt: RecommendedExtension) => {
    // Evita duplicar na equipe
    const alreadyExists = extensions.some(
      (e) =>
        e.tab === 'team' &&
        e.name.toLowerCase().trim() === recExt.name.toLowerCase().trim(),
    );
    if (alreadyExists) return;

    const payload = {
      name: recExt.name,
      iconType: recExt.iconType,
      iconUrl: recExt.iconUrl,
      iconBg: recExt.iconBg,
      enabled: true,
      status: 'available',
      description: recExt.description,
      provider: recExt.provider,
      providerUrl: recExt.providerUrl,
      tab: 'team',
    };

    try {
      await api.extensions.create(payload);
      await fetchExtensions();
    } catch (err: any) {
      console.error('Erro ao adicionar extensão recomendada:', err);
    }
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#272935] bg-[#14151B]">
      <TabelaExtensoes
        extensions={extensions}
        onAddClick={() => setIsModalOpen(true)}
        onToggleEnabled={handleToggleEnabled}
        onDelete={handleDeleteExtension}
        onAddRecommended={handleAddRecommended}
      />

      <ModalAdicionarExtensao
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveExtension}
      />
    </div>
  );
};

export default ExtensoesPage;
