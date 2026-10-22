import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Globe,
  Palette,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { serviceSync } from '@/services/sync/service.sync';
import { appUpdateService } from '@/services/app-update/service.update';
import { toast } from '@/components/ui/notification';
import { serviceBasePresets, BaseBrowserPreset } from '@/services/presets/service.base-presets';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ContaTab,
  NavegadorTab,
  RedeTab,
  AparenciaTab,
  ModalEditorJson,
  NetworkSettings,
} from '@/components/configuration';

type ConfigTab = 'account' | 'browser' | 'network' | 'appearance';

const DEFAULT_NETWORK: NetworkSettings = {
  enforceProxyCheck: true,
  dnsProvider: 'cloudflare',
  proxyTimeout: 10,
};

export const ConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const tabParam = searchParams.get('tab') as ConfigTab | null;
  const initialTab: ConfigTab =
    tabParam && ['account', 'browser', 'network', 'appearance'].includes(tabParam)
      ? tabParam
      : 'account';

  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get('tab') as ConfigTab | null;
    if (currentTab && ['account', 'browser', 'network', 'appearance'].includes(currentTab)) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const [cloudOnline, setCloudOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Base Preset oficial e formulário completo integrado no frontend
  const [basePreset, setBasePreset] = useState<BaseBrowserPreset>(() =>
    serviceBasePresets.getActivePreset(),
  );

  const [presetFormData, setPresetFormData] = useState<any>(() => {
    const active = serviceBasePresets.getActivePreset();
    const defaults = serviceBasePresets.createProfileFormData();
    return {
      ...defaults,
      ...active,
      os: active.defaultOS || 'windows',
      kernel: active.defaultKernel || 'AstroBrowser',
      name: active.name || 'Preset Base Oficial Star',
    };
  });

  const handlePresetChange = (key: string, value: any) => {
    setPresetFormData((prev: any) => {
      const updated = { ...prev, [key]: value };
      if (key === 'os') updated.defaultOS = value;
      if (key === 'kernel') updated.defaultKernel = value;
      if (key === 'defaultOS') updated.os = value;
      if (key === 'defaultKernel') updated.kernel = value;
      return updated;
    });
  };

  // Modal para visualização e edição de JSON bruto
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);

  // Configurações de Rede
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>(() => {
    try {
      const saved = localStorage.getItem('star_network_settings');
      return saved ? { ...DEFAULT_NETWORK, ...JSON.parse(saved) } : DEFAULT_NETWORK;
    } catch {
      return DEFAULT_NETWORK;
    }
  });

  // Preferência Sonora
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('star_notif_sound') !== 'false';
    } catch {
      return true;
    }
  });

  // Checar saúde da nuvem
  useEffect(() => {
    let isMounted = true;
    serviceSync
      .checkHealth()
      .then((res) => {
        if (isMounted) setCloudOnline(res.cloud_online);
      })
      .catch(() => {
        if (isMounted) setCloudOnline(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value as ConfigTab);
    setSearchParams({ tab: value }, { replace: true });
  };

  const handleSave = () => {
    try {
      const presetToSave: BaseBrowserPreset = {
        ...basePreset,
        ...presetFormData,
        defaultOS: presetFormData.os || presetFormData.defaultOS || 'windows',
        defaultKernel: presetFormData.kernel || presetFormData.defaultKernel || 'AstroBrowser',
      };
      serviceBasePresets.saveActivePreset(presetToSave);
      setBasePreset(presetToSave);
      localStorage.setItem('star_network_settings', JSON.stringify(networkSettings));
      localStorage.setItem('star_notif_sound', String(soundEnabled));
      toast.success('Configurações e presets gravados com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    }
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar as configurações e os presets base para os padrões oficiais de fábrica?')) {
      const restored = serviceBasePresets.resetToDefaults();
      setBasePreset(restored);
      setPresetFormData({
        ...serviceBasePresets.createProfileFormData(),
        ...restored,
        os: restored.defaultOS || 'windows',
        kernel: restored.defaultKernel || 'AstroBrowser',
        name: restored.name || 'Preset Base Oficial Star',
      });
      setNetworkSettings(DEFAULT_NETWORK);
      setSoundEnabled(true);
      localStorage.removeItem('star_network_settings');
      toast.info('Configurações e presets oficiais restaurados.');
    }
  };

  const handleOpenJsonModal = () => {
    setRawJsonText(serviceBasePresets.exportPresetJson(basePreset));
    setRawJsonError(null);
    setIsJsonModalOpen(true);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
      setRawJsonError(null);
    } catch (err: any) {
      setRawJsonError(err.message || 'JSON inválido');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJsonText);
    toast.success('JSON copiado para a área de transferência');
  };

  const handleApplyRawJson = () => {
    try {
      const merged = serviceBasePresets.importPresetJson(rawJsonText);
      setBasePreset(merged);
      setPresetFormData({
        ...serviceBasePresets.createProfileFormData(),
        ...merged,
        os: merged.defaultOS || 'windows',
        kernel: merged.defaultKernel || 'AstroBrowser',
        name: merged.name || 'Preset Base Oficial Star',
      });
      setIsJsonModalOpen(false);
      toast.success('Preset JSON atualizado e aplicado com sucesso!');
    } catch (err: any) {
      setRawJsonError(err.message || 'Erro ao processar JSON');
    }
  };

  const handleDownloadPresetJson = () => {
    try {
      const jsonStr = serviceBasePresets.exportPresetJson(basePreset);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preset-${(basePreset.name || 'star-base').toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Arquivo JSON do preset baixado com sucesso!');
    } catch {
      toast.error('Erro ao gerar download do arquivo.');
    }
  };

  const handleUploadPresetJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const merged = serviceBasePresets.importPresetJson(content);
        setBasePreset(merged);
        setPresetFormData({
          ...serviceBasePresets.createProfileFormData(),
          ...merged,
          os: merged.defaultOS || 'windows',
          kernel: merged.defaultKernel || 'AstroBrowser',
          name: merged.name || 'Preset Base Oficial Star',
        });
        toast.success('Preset importado e aplicado com sucesso!');
      } catch (err: any) {
        toast.error(err?.message || 'Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await serviceSync.syncProfiles(undefined, true);
      toast.success('Sincronização bidirecional concluída com sucesso!');
    } catch {
      toast.error('Erro ao conectar com servidor de sincronização.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await appUpdateService.checkForAppUpdate();
      if (res?.hasUpdate) {
        toast.info(`Atualização disponível: ${res.latestVersion}`);
      } else {
        toast.success('O Star Multilogin já está na versão mais recente!');
      }
    } catch {
      toast.error('Falha ao verificar atualizações.');
    } finally {
      setIsCheckingUpdate(false);
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
        onValueChange={handleTabChange}
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
            <ContaTab
              user={user}
              cloudOnline={cloudOnline}
              isSyncing={isSyncing}
              onSyncNow={handleSyncNow}
              onLogout={logout}
              onNavigateLogin={() => navigate('/auth/login')}
            />
          </TabsContent>

          {/* Aba 2: Navegador & Antidetect (Presets Base em Rolagem Contínua) */}
          <TabsContent value="browser">
            <NavegadorTab
              formData={presetFormData}
              onChange={handlePresetChange}
              onSave={handleSave}
              onReset={handleReset}
              onOpenJsonModal={handleOpenJsonModal}
              onDownloadJson={handleDownloadPresetJson}
              onUploadJson={handleUploadPresetJson}
            />
          </TabsContent>

          {/* Aba 3: Rede & Proxies */}
          <TabsContent value="network">
            <RedeTab
              settings={networkSettings}
              onChange={(updated) => setNetworkSettings(updated)}
            />
          </TabsContent>

          {/* Aba 4: Geral & Aparência */}
          <TabsContent value="appearance">
            <AparenciaTab
              theme={theme}
              onThemeChange={(newTheme) => setTheme(newTheme)}
              soundEnabled={soundEnabled}
              onSoundEnabledChange={(val) => setSoundEnabled(val)}
              isCheckingUpdate={isCheckingUpdate}
              onCheckUpdate={handleCheckUpdate}
            />
          </TabsContent>
        </main>

        {/* ═══════════════════════════════════════════════════════════════
            RODAPÉ FIXO CENTRALIZADO (Glassmorphism Footer)
        ═══════════════════════════════════════════════════════════════ */}
        <footer className="flex shrink-0 items-center border-t border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#1A1B23]/95 backdrop-blur-md px-6 py-3.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="gap-2 text-xs text-slate-500 hover:text-red-500 dark:text-[#8E92A2] dark:hover:text-red-400"
            >
              <RotateCcw size={14} />
              <span>Restaurar Fábrica</span>
            </Button>

            <Button
              variant="default"
              onClick={handleSave}
              className="gap-2 px-7 py-2.5 text-xs font-bold shadow-md shadow-[#238636]/25"
            >
              <CheckCircle2 size={15} />
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </footer>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL DE EDIÇÃO DE PRESET BRUTO (JSON IDE Theme)
      ═══════════════════════════════════════════════════════════════ */}
      <ModalEditorJson
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        rawJsonText={rawJsonText}
        rawJsonError={rawJsonError}
        onChangeText={(text) => {
          setRawJsonText(text);
          if (rawJsonError) setRawJsonError(null);
        }}
        onFormat={handleFormatJson}
        onCopy={handleCopyJson}
        onResetDefaults={() => {
          setRawJsonText(serviceBasePresets.exportPresetJson(serviceBasePresets.resetToDefaults()));
          setRawJsonError(null);
          toast.info('JSON restaurado para os padrões de fábrica');
        }}
        onApply={handleApplyRawJson}
      />
    </div>
  );
};

export default ConfigurationPage;
