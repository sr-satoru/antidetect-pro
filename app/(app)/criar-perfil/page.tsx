import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GeralTab } from '@/components/criar-perfil/geral';
import { ProxyTab } from '@/components/criar-perfil/proxy';
import { ImpressaoDigitalTab } from '@/components/criar-perfil/impressoes';
import { PlataformaTab } from '@/components/criar-perfil/plataforma';
import { AvancadoTab } from '@/components/criar-perfil/avancado';
import { Previas } from '@/components/criar-perfil/previas';
import { PerfilTabsHeader } from '@/components/perfis/perfil-tabs-header';
import { PerfilFooter } from '@/components/perfis/perfil-footer';
import { api } from '@/services/index.api';
import { toast } from '@/components/ui/notification';

import { serviceBasePresets } from '@/services/presets/service.base-presets';

export const CriarPerfilPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('geral');
  const [formData, setFormData] = useState<any>(() =>
    serviceBasePresets.createProfileFormData(),
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.profiles.create(formData);
      toast.success('Perfil criado com sucesso');

      navigate('/perfis');
    } catch (err: any) {
      toast.error(`Erro ao criar perfil: ${err.message || 'Falha na comunicação com o backend local.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] shadow-xs">
      {/* Barra superior de Abas */}
      <PerfilTabsHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Corpo Principal com Scroll à direita do Previas */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin p-5 lg:p-7">
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* Coluna Esquerda: Formulário */}
          <div className="flex-1 min-w-0">
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
          </div>

          {/* Coluna Direita: Prévias Sticky à esquerda do Scroll Principal */}
          <div className="w-full lg:w-[390px] shrink-0 sticky top-0 self-start">
            <Previas formData={formData} onChange={handleChange} />
          </div>
        </div>
      </div>

      {/* Rodapé fixado na base com botões OK e Cancelar e suporte */}
      <PerfilFooter
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={() => navigate('/perfis')}
      />
    </div>
  );
};

export default CriarPerfilPage;
