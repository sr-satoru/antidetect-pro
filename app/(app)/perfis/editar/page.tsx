import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { GeralTab } from '@/components/criar-perfil/geral';
import { ProxyTab } from '@/components/criar-perfil/proxy';
import { ImpressaoDigitalTab } from '@/components/criar-perfil/impressoes';
import { PlataformaTab } from '@/components/criar-perfil/plataforma';
import { AvancadoTab } from '@/components/criar-perfil/avancado';
import { Previas } from '@/components/criar-perfil/previas';
import { PerfilTabsHeader } from '@/components/perfis/perfil-tabs-header';
import { PerfilFooter } from '@/components/perfis/perfil-footer';
import { profileToFormData } from '@/services/perfis/service.mapper';
import { api } from '@/services/index.api';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/notification';

export const EditarPerfilPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabParam || 'geral');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const [formData, setFormData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega os dados reais do perfil a partir do backend
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const profile = await api.profiles.get(id);
        const mapped = profileToFormData(profile);
        setFormData(mapped);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados do perfil.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!id || !formData) return;
    try {
      setIsSaving(true);
      await api.profiles.update(id, formData);
      toast.success('Perfil atualizado com sucesso');

      // Sincronização automática na nuvem ao salvar edições
      api.profiles.syncToCloud(id).catch(() => {});

      navigate('/perfis');
    } catch (err: any) {
      toast.error(`Erro ao salvar alterações: ${err.message || 'Falha de comunicação.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#171923] text-white">
        <Loader2 size={24} className="animate-spin text-[#DFE104]" />
        <span className="text-xs text-[#9EA2AE]">Carregando configurações do perfil...</span>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#171923] p-6 text-white">
        <AlertCircle size={32} className="text-[#ff5a6e]" />
        <p className="text-sm text-[#F4F4F6]">{error || 'Perfil não encontrado.'}</p>
        <button
          type="button"
          onClick={() => navigate('/perfis')}
          className="rounded-lg bg-[#2A2B36] px-4 py-2 text-xs font-medium text-white hover:bg-[#343644]"
        >
          Voltar para Perfis
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[#353744] bg-[#24252D] shadow-xl">
      {/* Abas Superiores Modulares */}
      <PerfilTabsHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Grid Rolável com Re-importação de Todos os Módulos do Criar Perfil */}
      <div className="flex flex-1 flex-col items-start gap-6 overflow-y-auto p-5 lg:flex-row lg:gap-8 lg:p-7">
        {activeTab === 'geral' && (
          <GeralTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'proxy' && (
          <ProxyTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'impressao' && (
          <ImpressaoDigitalTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'plataforma' && (
          <PlataformaTab formData={formData} onChange={handleChange} />
        )}

        {activeTab === 'avancado' && (
          <AvancadoTab formData={formData} onChange={handleChange} />
        )}

        {/* Coluna Direita: Prévias */}
        <Previas formData={formData} onChange={handleChange} />
      </div>

      {/* Rodapé Modular com Salvar/Cancelar */}
      <PerfilFooter
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={() => navigate('/perfis')}
      />
    </div>
  );
};

export default EditarPerfilPage;
