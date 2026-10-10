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

      navigate('/perfis');
    } catch (err: any) {
      toast.error(`Erro ao salvar alterações: ${err.message || 'Falha de comunicação.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white dark:bg-[#171923] text-slate-800 dark:text-white">
        <Loader2 size={24} className="animate-spin text-emerald-600 dark:text-[#00FF66]" />
        <span className="text-xs text-slate-500 dark:text-[#9EA2AE]">Carregando configurações do perfil...</span>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white dark:bg-[#171923] p-6 text-slate-800 dark:text-white">
        <AlertCircle size={32} className="text-red-500 dark:text-[#ff5a6e]" />
        <p className="text-sm text-slate-700 dark:text-[#F4F4F6]">{error || 'Perfil não encontrado.'}</p>
        <button
          type="button"
          onClick={() => navigate('/perfis')}
          className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#2A2B36] dark:text-white dark:hover:bg-[#343644] px-4 py-2 text-xs font-medium transition-colors"
        >
          Voltar para Perfis
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] shadow-sm dark:shadow-none">
      {/* Abas Superiores Modulares */}
      <PerfilTabsHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Grid Principal com Scroll à direita do Previas */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin p-5 lg:p-7">
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* Coluna Esquerda: Formulário */}
          <div className="flex-1 min-w-0">
            {activeTab === 'geral' && (
              <GeralTab formData={formData} onChange={handleChange} isEditing={true} />
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
          </div>

          {/* Coluna Direita: Prévias Sticky à esquerda do Scroll Principal */}
          <div className="w-full lg:w-[390px] shrink-0 sticky top-0 self-start">
            <Previas formData={formData} onChange={handleChange} />
          </div>
        </div>
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
