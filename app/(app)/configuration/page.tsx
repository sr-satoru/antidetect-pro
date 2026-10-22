import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, ShieldCheck, Palette } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { serviceConfiguration, NetworkSettings } from '@/services/configuration';
import { ContaTab, NavegadorTab, AparenciaTab } from '@/components/configuration';

type ConfigTab = 'account' | 'browser' | 'appearance';

export const ConfigurationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ConfigTab | null;
  const [activeTab, setActiveTab] = useState<ConfigTab>(
    tabParam && ['account', 'browser', 'appearance'].includes(tabParam)
      ? tabParam
      : 'account'
  );

  useEffect(() => {
    const current = searchParams.get('tab') as ConfigTab | null;
    if (current && ['account', 'browser', 'appearance'].includes(current)) {
      setActiveTab(current);
    }
  }, [searchParams]);

  // Estados persistidos gerenciados via serviceConfiguration
  const [presetFormData, setPresetFormData] = useState<any>(() =>
    serviceConfiguration.getInitialPresetFormData()
  );
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>(() =>
    serviceConfiguration.getNetworkSettings()
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    serviceConfiguration.getSoundEnabled()
  );

  const handlePresetChange = (key: string, value: any) => {
    setPresetFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = () => {
    try {
      serviceConfiguration.saveAll(presetFormData, networkSettings, soundEnabled);
      toast.success('Todas as configurações e presets foram gravados com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    }
  };

  const handleResetAll = () => {
    if (confirm('Deseja restaurar todas as configurações e presets para os padrões oficiais de fábrica?')) {
      const restored = serviceConfiguration.resetAll();
      setPresetFormData(restored.formData);
      setNetworkSettings(restored.network);
      setSoundEnabled(restored.soundEnabled);
      toast.info('Configurações e presets restaurados para o padrão de fábrica.');
    }
  };

  const tabs = [
    { id: 'account', label: 'Conta & Nuvem', icon: User },
    { id: 'browser', label: 'Navegador & Antidetect', icon: ShieldCheck },
    { id: 'appearance', label: 'Geral & Aparência', icon: Palette },
  ] as const;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#121316] shadow-xs select-none">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as ConfigTab);
          setSearchParams({ tab: v }, { replace: true });
        }}
        className="flex h-full w-full flex-col overflow-hidden"
      >
        {/* ═══════════════════════════════════════════════════════════════
            TOP BAR DE NAVEGAÇÃO PREMIUM CENTRALIZADA (Capsule Tabs)
        ═══════════════════════════════════════════════════════════════ */}
        <header className="flex shrink-0 items-center border-b border-slate-200/80 dark:border-[#2D3039] bg-white/90 dark:bg-[#18191E]/90 backdrop-blur-md px-6 py-3">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-center">
            <TabsList className="bg-slate-100/90 dark:bg-[#1F2026] p-1.5 rounded-xl border border-slate-200/60 dark:border-[#2D3039] flex items-center gap-1.5 border-b-0 shadow-xs">
              {tabs.map((tab) => {
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-lg px-6 py-2.5 text-[13.5px] font-medium transition-all text-slate-600 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-[#454750] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-slate-200/50 dark:data-[state=active]:border-white/10 after:hidden cursor-pointer"
                  >
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            ÁREA DE CONTEÚDO CENTRALIZADA (Scrollável)
        ═══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
          {/* Aba 1: Conta & Nuvem */}
          <TabsContent value="account">
            <ContaTab />
          </TabsContent>

          {/* Aba 2: Navegador & Antidetect (Presets Base em Rolagem Contínua) */}
          <TabsContent value="browser">
            <NavegadorTab
              formData={presetFormData}
              onChange={handlePresetChange}
              onSave={handleSaveAll}
              onReset={handleResetAll}
            />
          </TabsContent>

          {/* Aba 3: Geral & Aparência */}
          <TabsContent value="appearance">
            <AparenciaTab soundEnabled={soundEnabled} onSoundEnabledChange={setSoundEnabled} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
};

export default ConfigurationPage;
