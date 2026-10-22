import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Globe,
  Palette,
  RefreshCw,
  LogOut,
  Zap,
  Check,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Download,
  FileCode,
  Copy,
  Upload,
  Code2,
  Info,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { serviceSync } from '@/services/sync/service.sync';
import { appUpdateService, CURRENT_APP_VERSION } from '@/services/app-update/service.update';
import { toast } from '@/components/ui/notification';
import { AstroBrowserIcon, AstroFoxIcon } from '@/components/icons';
import { OsIcon } from '@/components/ui/os-icon';
import { serviceBasePresets, BaseBrowserPreset } from '@/services/presets/service.base-presets';
import { SupportedOS, SupportedKernel } from '@/services/navegador-presets';

type ConfigTab = 'account' | 'browser' | 'network' | 'appearance';

interface NetworkSettings {
  enforceProxyCheck: boolean;
  dnsProvider: string;
  proxyTimeout: number;
}

const DEFAULT_NETWORK: NetworkSettings = {
  enforceProxyCheck: true,
  dnsProvider: 'cloudflare',
  proxyTimeout: 10,
};

// Toggle Switch estilo Apple / Linear UI
const Switch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-5 w-9.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden ${
      checked
        ? 'bg-[#238636] shadow-[0_0_10px_rgba(35,134,54,0.35)]'
        : 'bg-slate-300 dark:bg-[#323442]'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
        checked ? 'translate-x-4.5' : 'translate-x-0'
      }`}
    />
  </button>
);

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

  // Base Preset oficial e configurável pelo usuário
  const [basePreset, setBasePreset] = useState<BaseBrowserPreset>(() =>
    serviceBasePresets.getActivePreset(),
  );

  // Modal para visualização e edição de JSON bruto
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);

  // Network settings
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>(() => {
    try {
      const saved = localStorage.getItem('star_network_settings');
      return saved ? { ...DEFAULT_NETWORK, ...JSON.parse(saved) } : DEFAULT_NETWORK;
    } catch {
      return DEFAULT_NETWORK;
    }
  });

  // Sound preference
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

  const handleSave = () => {
    try {
      serviceBasePresets.saveActivePreset(basePreset);
      localStorage.setItem('star_network_settings', JSON.stringify(networkSettings));
      localStorage.setItem('star_notif_sound', String(soundEnabled));
      toast.success('Configurações e presets salvos com sucesso');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar as configurações e os presets base para os padrões oficiais de fábrica?')) {
      const restored = serviceBasePresets.resetToDefaults();
      setBasePreset(restored);
      setNetworkSettings(DEFAULT_NETWORK);
      setSoundEnabled(true);
      localStorage.removeItem('star_network_settings');
      toast.info('Configurações e presets oficiais restaurados');
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
      setIsJsonModalOpen(false);
      toast.success('Preset JSON atualizado e aplicado com sucesso');
    } catch (err: any) {
      setRawJsonError(err.message || 'Erro ao processar JSON');
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await serviceSync.syncProfiles(undefined, true);
      toast.success('Sincronização bidirecional concluída');
    } catch {
      toast.error('Erro ao conectar com servidor de sincronização');
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
        toast.success('O Star Multilogin já está na versão mais recente');
      }
    } catch {
      toast.error('Falha ao verificar atualizações');
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
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] shadow-xl shadow-slate-900/5 dark:shadow-2xl select-none">
      {/* ═══════════════════════════════════════════════════════════════
          MENU SUPERIOR DE ABAS (Estilo Criar Perfil / Star Multilogin)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex shrink-0 items-center gap-8 overflow-x-auto border-b border-slate-200 dark:border-[#30323E] bg-slate-50/80 dark:bg-[#24252D] px-6 pt-4 select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as ConfigTab);
                setSearchParams({ tab: tab.id }, { replace: true });
              }}
              className={`relative flex items-center gap-2 cursor-pointer pb-3 text-[13.5px] tracking-wide transition-all ${
                isActive
                  ? 'font-semibold text-slate-900 dark:text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2.5px] after:rounded-t-sm after:bg-[#238636] dark:after:bg-[#2ea043] after:content-[""]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#8E92A2] dark:hover:text-[#C4C7D5]'
              }`}
            >
              <IconComponent size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ÁREA CENTRAL DE CONTEÚDO (Scrollável)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {/* ─────────────────────────────────────────────────────────────
            ABA 1: CONTA & NUVEM
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'account' && (
          <div className="max-w-3xl space-y-4">
            {/* Cartão de Identidade do Usuário */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#238636] to-[#2ea043] text-white text-base font-bold shadow-md shadow-[#238636]/25">
                    {!user?.is_offline && user?.email
                      ? (user?.username ? user.username.charAt(0).toUpperCase() : 'U')
                      : <User size={22} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {!user?.is_offline && user?.email ? user.email : 'Workspace Local'}
                      </span>
                      <span className="rounded-full bg-slate-200/80 dark:bg-[#2B2D38] px-2 py-0.5 text-[10.5px] font-semibold text-slate-700 dark:text-[#A7AAB9]">
                        {!user?.is_offline ? (user?.plan || 'PRO').toUpperCase() : 'OFFLINE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                      {!user?.is_offline
                        ? 'Sessão conectada com a nuvem Star Multilogin'
                        : 'Modo Local Isolado · Dados armazenados exclusivamente no disco rígido deste computador'}
                    </p>
                  </div>
                </div>

                <div>
                  {!user?.is_offline ? (
                    <button
                      type="button"
                      onClick={logout}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-500/10 px-3.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Desconectar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/auth/login')}
                      className="flex h-8.5 items-center gap-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white px-3.5 text-xs font-medium shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <Zap size={13} />
                      <span>Conectar Nuvem</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sincronização & Backup */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3.5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Sincronização em Nuvem (Star VPS)
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  Mantenha seus perfis, proxies e extensões sincronizados entre múltiplos computadores com criptografia de ponta a ponta.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-white dark:bg-[#24252D] border border-slate-200 dark:border-[#353744]">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      cloudOnline === true
                        ? 'bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">
                      {cloudOnline === true ? 'Servidor de Nuvem Operacional' : 'Servidor em Espera ou Modo Local'}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                      Backup criptografado com chave AES-256 no backend nativo em Rust
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleSyncNow}
                  className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#353744] bg-slate-50 dark:bg-[#1C1D24] px-3 text-xs font-medium text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#282932] transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ABA 2: NAVEGADOR & ANTIDETECT (PRESETS BASE)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'browser' && (
          <div className="max-w-3xl space-y-4">
            {/* Cabeçalho do Preset Base com Botão do Editor JSON */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                      Presets de Configuração Base do Navegador
                    </h4>
                    <span className="rounded-full bg-[#238636]/10 text-[#2ea043] border border-[#238636]/30 px-2 py-0.5 text-[10px] font-semibold">
                      Ativo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-1 leading-relaxed">
                    Defina o Sistema Operacional padrão, motor e parâmetros que alimentam a criação de novos perfis e a visualização de prévias.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenJsonModal}
                    className="flex h-8.5 items-center gap-1.5 rounded-lg border border-[#238636]/40 bg-[#238636]/10 px-3.5 text-xs font-medium text-[#2ea043] hover:bg-[#238636]/20 transition-all cursor-pointer select-none active:scale-[0.98]"
                  >
                    <FileCode size={14} />
                    <span>Ver / Editar JSON Bruto</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 1. Escolha do Sistema Operacional Padrão */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3.5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Sistema Operacional Inicial
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  SO padrão pré-selecionado na criação de perfis e base para resolução, ecrã e hardware.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'windows' as SupportedOS, name: 'Windows', sub: 'Win32 • 10/11' },
                  { id: 'macos' as SupportedOS, name: 'macOS', sub: 'MacIntel • Apple' },
                  { id: 'linux' as SupportedOS, name: 'Linux', sub: 'Linux x86_64' },
                  { id: 'android' as SupportedOS, name: 'Android', sub: 'Mobile • ARM' },
                ].map((osItem) => {
                  const isSelected = basePreset.defaultOS === osItem.id;
                  return (
                    <div
                      key={osItem.id}
                      onClick={() => {
                        const newOS = osItem.id;
                        setBasePreset({
                          ...basePreset,
                          defaultOS: newOS,
                          defaultKernel: newOS === 'android' ? 'AstroBrowser' : basePreset.defaultKernel,
                        });
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-[#238636] dark:border-[#2ea043] bg-white dark:bg-[#24252D] ring-2 ring-[#238636]/20 shadow-xs'
                          : 'border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:border-slate-300 dark:hover:border-[#434555]'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#238636] text-white">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      )}
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#1C1D24] text-slate-700 dark:text-[#C4C7D5] mb-1.5">
                        <OsIcon os={osItem.id} size={20} />
                      </div>
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {osItem.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-[#8E92A2] mt-0.5">
                        {osItem.sub}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Escolha do Motor Base */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3.5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Motor de Navegação Padrão
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  Núcleo utilizado automaticamente ao gerar novos perfis de navegação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card Chromium */}
                <div
                  onClick={() => setBasePreset({ ...basePreset, defaultKernel: 'AstroBrowser' })}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    basePreset.defaultKernel === 'AstroBrowser'
                      ? 'border-[#238636] dark:border-[#2ea043] bg-white dark:bg-[#24252D] ring-2 ring-[#238636]/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:border-slate-300 dark:hover:border-[#434555]'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <AstroBrowserIcon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        Star Chromium (AstroBrowser)
                      </span>
                      {basePreset.defaultKernel === 'AstroBrowser' && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#238636] text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5 leading-relaxed">
                      Baseado em Chromium com bypass anti-detecção e suporte completo à Chrome Web Store.
                    </p>
                  </div>
                </div>

                {/* Card Firefox */}
                <div
                  onClick={() => {
                    if (basePreset.defaultOS !== 'android') {
                      setBasePreset({ ...basePreset, defaultKernel: 'AstroFox' });
                    }
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    basePreset.defaultOS === 'android'
                      ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-[#353744] bg-slate-100/50 dark:bg-[#1A1B22]'
                      : basePreset.defaultKernel === 'AstroFox'
                        ? 'border-[#238636] dark:border-[#2ea043] bg-white dark:bg-[#24252D] ring-2 ring-[#238636]/20 shadow-xs cursor-pointer'
                        : 'border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:border-slate-300 dark:hover:border-[#434555] cursor-pointer'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                    <AstroFoxIcon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        Star Fox (AstroFox)
                      </span>
                      {basePreset.defaultKernel === 'AstroFox' && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#238636] text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5 leading-relaxed">
                      Motor Gecko com isolamento estrito de processos e proteção avançada de memória.
                      {basePreset.defaultOS === 'android' && ' (Não aplicável ao SO Android)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Parâmetros de Rede e Antidetecção */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Parâmetros de Rede & Impressão Digital
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  Regras e fallbacks aplicados na inicialização de novos perfis.
                </p>
              </div>

              <div className="divide-y divide-slate-200/60 dark:divide-[#30323E] text-xs">
                {/* Timezone Mode */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Fuso Horário Padrão</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      {basePreset.timezoneMode === 'ip'
                        ? 'Com base no IP do proxy (Recomendado). Nenhum fuso é forçado e a geolocalização do proxy é preservada.'
                        : 'Fuso horário manual fixo definido abaixo.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={basePreset.timezoneMode}
                      onChange={(e) =>
                        setBasePreset({
                          ...basePreset,
                          timezoneMode: e.target.value,
                          customTimezone: e.target.value === 'custom' ? (basePreset.customTimezone || 'America/Sao_Paulo') : '',
                        })
                      }
                      className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="ip">Com base no IP (Recomendado)</option>
                      <option value="custom">Personalizado (Manual)</option>
                    </select>
                    {basePreset.timezoneMode === 'custom' && (
                      <input
                        type="text"
                        value={basePreset.customTimezone}
                        onChange={(e) => setBasePreset({ ...basePreset, customTimezone: e.target.value })}
                        placeholder="America/Sao_Paulo"
                        className="h-8.5 w-44 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-2.5 font-mono text-slate-800 dark:text-white focus:outline-hidden text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Localização Mode */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Geolocalização Padrão</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Define como as coordenadas geográficas (latitude/longitude) são informadas às páginas.
                    </p>
                  </div>
                  <select
                    value={basePreset.locationMode}
                    onChange={(e) => setBasePreset({ ...basePreset, locationMode: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="ip">Com base no IP (Recomendado)</option>
                    <option value="block">Bloquear Localização</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {/* Língua Mode */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Língua do Navegador</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      {basePreset.languageMode === 'ip'
                        ? 'Com base no país do IP do proxy (Recomendado).'
                        : 'Línguas configuradas manualmente.'}
                    </p>
                  </div>
                  <select
                    value={basePreset.languageMode}
                    onChange={(e) =>
                      setBasePreset({
                        ...basePreset,
                        languageMode: e.target.value,
                        customLanguage: e.target.value === 'custom' ? (basePreset.customLanguage || 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7') : '',
                      })
                    }
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="ip">Com base no IP (Recomendado)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {/* Resolução do Ecrã */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Resolução do Ecrã</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      {basePreset.screenResolutionMode === 'default'
                        ? 'Com base no User-Agent / SO (Gera dimensões e proporção de pixels DPR autênticas para o modelo do SO).'
                        : 'Resolução fixa personalizada.'}
                    </p>
                  </div>
                  <select
                    value={basePreset.screenResolutionMode}
                    onChange={(e) => setBasePreset({ ...basePreset, screenResolutionMode: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="default">Com base no User-Agent / SO (Recomendado)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {/* WebRTC */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Proteção contra Vazamento WebRTC</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Modo de camuflagem do endereço IP nas conexões peer-to-peer WebRTC.
                    </p>
                  </div>
                  <select
                    value={basePreset.webrtcMode}
                    onChange={(e) => setBasePreset({ ...basePreset, webrtcMode: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="disabled">Desativado (Máxima Segurança)</option>
                    <option value="substitute">Substituto (IP do Proxy)</option>
                    <option value="forward">Encaminhar</option>
                    <option value="real">Real (Nativo)</option>
                  </select>
                </div>

                {/* CPU Cores */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Núcleos de CPU Padrão</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Concorrência de hardware reportada através de navigator.hardwareConcurrency.
                    </p>
                  </div>
                  <select
                    value={basePreset.cpuCores}
                    onChange={(e) => setBasePreset({ ...basePreset, cpuCores: Number(e.target.value) })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value={2}>2 núcleos</option>
                    <option value={4}>4 núcleos</option>
                    <option value={6}>6 núcleos</option>
                    <option value={8}>8 núcleos (Padrão)</option>
                    <option value={12}>12 núcleos</option>
                    <option value={16}>16 núcleos</option>
                  </select>
                </div>

                {/* RAM */}
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Memória RAM Padrão</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Memória do dispositivo reportada através de navigator.deviceMemory.
                    </p>
                  </div>
                  <select
                    value={basePreset.ramGb}
                    onChange={(e) => setBasePreset({ ...basePreset, ramGb: Number(e.target.value) })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value={4}>4 GB</option>
                    <option value={8}>8 GB (Padrão)</option>
                    <option value={16}>16 GB</option>
                    <option value={32}>32 GB</option>
                  </select>
                </div>

                {/* Canvas Noise */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Ruído de Canvas 2D</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Injeta micro-ruído imperceptível para impedir rastreamento persistente por Canvas hash.
                    </p>
                  </div>
                  <Switch
                    checked={!!basePreset.hardwareNoise?.canvas}
                    onChange={(val) =>
                      setBasePreset({
                        ...basePreset,
                        hardwareNoise: { ...basePreset.hardwareNoise, canvas: val },
                      })
                    }
                  />
                </div>

                {/* WebGL Image Noise */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Ruído de Imagem WebGL</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Aplica perturbação dinâmica aos buffers de renderização WebGL.
                    </p>
                  </div>
                  <Switch
                    checked={!!basePreset.hardwareNoise?.webglImage}
                    onChange={(val) =>
                      setBasePreset({
                        ...basePreset,
                        hardwareNoise: { ...basePreset.hardwareNoise, webglImage: val },
                      })
                    }
                  />
                </div>

                {/* AudioContext Noise */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Proteção de Áudio (AudioContext)</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Protege frequências do oscilador de áudio para evitar identificação estática.
                    </p>
                  </div>
                  <Switch
                    checked={!!basePreset.hardwareNoise?.audioContext}
                    onChange={(val) =>
                      setBasePreset({
                        ...basePreset,
                        hardwareNoise: { ...basePreset.hardwareNoise, audioContext: val },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ABA 3: REDE & PROXIES
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'network' && (
          <div className="max-w-3xl space-y-4">
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Políticas de Conexão e Proteção de Proxy
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  Evite que páginas descubram seu IP residencial em caso de instabilidade na rota do proxy.
                </p>
              </div>

              <div className="divide-y divide-slate-200/60 dark:divide-[#30323E] text-xs">
                {/* Kill Switch */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Kill-Switch de Inicialização</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Bloqueia a abertura do navegador caso o proxy configurado falhe ou esteja desconectado.
                    </p>
                  </div>
                  <Switch
                    checked={networkSettings.enforceProxyCheck}
                    onChange={(val) => setNetworkSettings({ ...networkSettings, enforceProxyCheck: val })}
                  />
                </div>

                {/* DNS Seguro */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">DNS Seguro (DoH)</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Criptografa consultas de domínios evitando vazamento de nomes (DNS Leak).
                    </p>
                  </div>
                  <select
                    value={networkSettings.dnsProvider}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, dnsProvider: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="cloudflare">Cloudflare (1.1.1.1)</option>
                    <option value="google">Google DNS (8.8.8.8)</option>
                    <option value="proxy">DNS do próprio Proxy</option>
                  </select>
                </div>

                {/* Timeout */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Tempo Limite de Teste (Timeout)</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Tempo máximo para validar a latência do proxy antes de declarar offline.
                    </p>
                  </div>
                  <select
                    value={networkSettings.proxyTimeout}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, proxyTimeout: Number(e.target.value) })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="5">5 segundos</option>
                    <option value="10">10 segundos (Recomendado)</option>
                    <option value="15">15 segundos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ABA 4: GERAL & APARÊNCIA
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <div className="max-w-3xl space-y-4">
            {/* Escolha do Tema Visual */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3.5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Tema da Interface
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  Alterne entre modo escuro e modo claro para conforto visual.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[#238636] dark:border-[#2ea043] bg-white dark:bg-[#24252D] ring-2 ring-[#238636]/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:border-slate-300 dark:hover:border-[#434555]'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0E] text-white border border-[#353744]">
                    <Moon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">Modo Escuro</span>
                      {theme === 'dark' && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#238636] text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">Contraste suave para longas jornadas de trabalho</p>
                  </div>
                </div>

                <div
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-[#238636] dark:border-[#2ea043] bg-white dark:bg-[#24252D] ring-2 ring-[#238636]/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:border-slate-300 dark:hover:border-[#434555]'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                    <Sun size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">Modo Claro</span>
                      {theme === 'light' && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#238636] text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">Ambiente nítido e de alta luminosidade</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferências de Sistema e Notificações */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Preferências & Atualizações
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  Avisos de sistema e versão do aplicativo.
                </p>
              </div>

              <div className="divide-y divide-slate-200/60 dark:divide-[#30323E] text-xs">
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Sons de Alerta</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Reproduz um sinal sutil ao concluir tarefas de sincronização.
                    </p>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onChange={(val) => setSoundEnabled(val)}
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Atualizações do Star Multilogin</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Versão instalada: <span className="font-mono text-slate-700 dark:text-[#C4C7D5]">v{CURRENT_APP_VERSION}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCheckingUpdate}
                    onClick={handleCheckUpdate}
                    className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#282932] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download size={13} className={isCheckingUpdate ? 'animate-bounce' : ''} />
                    <span>{isCheckingUpdate ? 'Verificando...' : 'Verificar Atualizações'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RODAPÉ FIXO COM BOTÕES (Estilo Criar Perfil / Star Multilogin)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-200 dark:border-[#30323E] bg-slate-50 dark:bg-[#1F2027] px-6 py-3.5">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 cursor-pointer rounded-md border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-[#8E92A2] hover:bg-slate-100 dark:hover:bg-[#282932] transition-all select-none active:scale-[0.98]"
        >
          <RotateCcw size={14} />
          <span>Restaurar Padrões</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 cursor-pointer rounded-md bg-[#238636] hover:bg-[#2ea043] text-white px-7 py-2 text-[13px] font-medium shadow-xs transition-all select-none active:scale-[0.98]"
        >
          <Save size={14} />
          <span>Salvar Alterações</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL DE VISUALIZAÇÃO E EDIÇÃO DO PRESET BASE (JSON BRUTO)
      ═══════════════════════════════════════════════════════════════ */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#16171E] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2B2D3A] px-6 py-4 bg-slate-50 dark:bg-[#1B1C24]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#238636]/15 text-[#2ea043] border border-[#238636]/30">
                  <FileCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Editor do Preset Base Oficial (JSON)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                    Modifique diretamente a estrutura de configurações base do sistema.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJsonModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2B2D3A] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#262833] px-6 py-2.5 bg-slate-100/70 dark:bg-[#1E1F29] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-500 dark:text-[#8E92A2]">default-base-preset.json</span>
                <span className="rounded bg-slate-200 dark:bg-[#2C2E3C] px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-[#A7AAB9]">
                  JSON Validado
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="flex items-center gap-1 rounded border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-2.5 py-1 text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-50 dark:hover:bg-[#2F313E] transition-colors cursor-pointer"
                  title="Formatar identação JSON"
                >
                  <Code2 size={12} />
                  <span>Formatar</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 rounded border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-2.5 py-1 text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-50 dark:hover:bg-[#2F313E] transition-colors cursor-pointer"
                >
                  <Copy size={12} />
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            {/* Modal Content - Editor */}
            <div className="flex-1 min-h-[380px] p-4 bg-slate-950 flex flex-col relative overflow-hidden">
              <textarea
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  if (rawJsonError) setRawJsonError(null);
                }}
                spellCheck={false}
                className="w-full flex-1 resize-none bg-transparent font-mono text-[12.5px] leading-relaxed text-slate-200 focus:outline-hidden custom-scrollbar"
                placeholder="Insira o JSON do preset..."
              />

              {rawJsonError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{rawJsonError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#2B2D3A] px-6 py-3.5 bg-slate-50 dark:bg-[#1B1C24]">
              <button
                type="button"
                onClick={() => {
                  setRawJsonText(serviceBasePresets.exportPresetJson(serviceBasePresets.resetToDefaults()));
                  setRawJsonError(null);
                  toast.info('JSON restaurado para os padrões de fábrica');
                }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white cursor-pointer transition-colors"
              >
                <RotateCcw size={12} />
                <span>Restaurar Fábrica no Editor</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJsonModalOpen(false)}
                  className="rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-4 py-2 text-xs font-medium text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#2F313E] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyRawJson}
                  className="flex items-center gap-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white px-5 py-2 text-xs font-medium shadow-xs transition-all cursor-pointer select-none active:scale-[0.98]"
                >
                  <Check size={14} />
                  <span>Aplicar & Salvar Preset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPage;
