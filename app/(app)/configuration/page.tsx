import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, ShieldCheck, Globe, Palette, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { serviceConfiguration, NetworkSettings } from '@/services/configuration';
import { ContaTab, NavegadorTab, RedeTab, AparenciaTab } from '@/components/configuration';

type ConfigTab = 'account' | 'browser' | 'network' | 'appearance';

export const ConfigurationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ConfigTab | null;
  const [activeTab, setActiveTab] = useState<ConfigTab>(
    tabParam && ['account', 'browser', 'network', 'appearance'].includes(tabParam)
      ? tabParam
      : 'account'
  );

  useEffect(() => {
    const current = searchParams.get('tab') as ConfigTab | null;
    if (current && ['account', 'browser', 'network', 'appearance'].includes(current)) {
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
    { id: 'network', label: 'Rede & Proxies', icon: Globe },
    { id: 'appearance', label: 'Geral & Aparência', icon: Palette },
  ] as const;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50 dark:bg-[#15161E] shadow-2xl select-none">
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
        <header className="flex shrink-0 items-center border-b border-slate-200/80 dark:border-white/[0.07] bg-white/90 dark:bg-[#1A1B24]/90 backdrop-blur-md px-6 py-2.5">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-center">
            <TabsList className="bg-slate-100/90 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/60 dark:border-white/[0.06] flex items-center gap-1 border-b-0">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-lg px-4 py-2 text-xs font-medium transition-all text-slate-600 dark:text-[#9EA2B4] hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-[#24252F] data-[state=active]:text-[#2ea043] dark:data-[state=active]:text-[#3fb950] data-[state=active]:font-semibold data-[state=active]:shadow-xs after:hidden gap-2"
                  >
                    <IconComponent size={14} />
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

          {/* Aba 3: Rede & Proxies */}
          <TabsContent value="network">
            <RedeTab settings={networkSettings} onChange={setNetworkSettings} />
          </TabsContent>

          {/* Aba 4: Geral & Aparência */}
          <TabsContent value="appearance">
            <AparenciaTab soundEnabled={soundEnabled} onSoundEnabledChange={setSoundEnabled} />
          </TabsContent>
        </main>

        {/* ═══════════════════════════════════════════════════════════════
            RODAPÉ FIXO CENTRALIZADO (Glassmorphism Footer)
        ═══════════════════════════════════════════════════════════════ */}
        <footer className="flex shrink-0 items-center border-t border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#1A1B23]/95 backdrop-blur-md px-6 py-3.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={handleResetAll}
              className="gap-2 text-xs text-slate-500 hover:text-red-500 dark:text-[#8E92A2] dark:hover:text-red-400"
            >
              <RotateCcw size={14} />
              <span>Restaurar Fábrica</span>
            </Button>

            <Button
              variant="default"
              onClick={handleSaveAll}
              className="gap-2 px-7 py-2.5 text-xs font-bold shadow-md shadow-[#238636]/25"
            >
              <CheckCircle2 size={15} />
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </footer>
      </Tabs>
    </div>
  );
};

export default ConfigurationPage;
