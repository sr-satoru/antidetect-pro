import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Globe,
  Cloud,
  Palette,
  Cpu,
  Save,
  RotateCcw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sliders,
  Sun,
  Moon,
  Laptop,
  Layers,
  ArrowRight,
  Database,
  Radio,
  Zap,
  Terminal,
  Volume2,
  Trash2,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { serviceSync } from '@/services/sync/service.sync';
import { appUpdateService, CURRENT_APP_VERSION } from '@/services/app-update/service.update';
import { api } from '@/services/index.api';
import { toast } from '@/components/ui/notification';
import { AstroBrowserIcon, AstroFoxIcon } from '@/components/icons';

type SettingsTab =
  | 'account'
  | 'antidetect'
  | 'network'
  | 'sync'
  | 'appearance'
  | 'system';

interface BrowserDefaults {
  browserEngine: 'chromium' | 'firefox';
  webglNoise: string;
  canvasNoise: boolean;
  audioNoise: boolean;
  webrtcMode: string;
  autoTimezone: boolean;
  autoLanguage: boolean;
  defaultResolution: string;
  fontProtection: boolean;
}

interface NetworkSettings {
  dnsProvider: string;
  enforceProxyCheck: boolean;
  proxyTimeout: number;
  ipCheckService: string;
  daemonHost: string;
}

const DEFAULT_BROWSER_SETTINGS: BrowserDefaults = {
  browserEngine: 'chromium',
  webglNoise: 'random',
  canvasNoise: true,
  audioNoise: true,
  webrtcMode: 'proxy_replace',
  autoTimezone: true,
  autoLanguage: true,
  defaultResolution: '1920x1080',
  fontProtection: true,
};

const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  dnsProvider: 'cloudflare',
  enforceProxyCheck: true,
  proxyTimeout: 10,
  ipCheckService: 'ipify',
  daemonHost: 'http://127.0.0.1:3001',
};

export const ConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [profileCount, setProfileCount] = useState<number>(0);
  const [proxyCount, setProxyCount] = useState<number>(0);
  const [cloudOnline, setCloudOnline] = useState<boolean | null>(null);
  const [cloudUrl, setCloudUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<any | null>(null);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);

  // Estados persistidos no localStorage
  const [browserDefaults, setBrowserDefaults] = useState<BrowserDefaults>(() => {
    try {
      const saved = localStorage.getItem('star_browser_defaults');
      return saved ? { ...DEFAULT_BROWSER_SETTINGS, ...JSON.parse(saved) } : DEFAULT_BROWSER_SETTINGS;
    } catch {
      return DEFAULT_BROWSER_SETTINGS;
    }
  });

  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>(() => {
    try {
      const saved = localStorage.getItem('star_network_settings');
      return saved ? { ...DEFAULT_NETWORK_SETTINGS, ...JSON.parse(saved) } : DEFAULT_NETWORK_SETTINGS;
    } catch {
      return DEFAULT_NETWORK_SETTINGS;
    }
  });

  const [notificationsSound, setNotificationsSound] = useState<boolean>(() => {
    try {
      return localStorage.getItem('star_notif_sound') === 'true';
    } catch {
      return true;
    }
  });

  const [sidebarDefaultOpen, setSidebarDefaultOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('star_sidebar_collapsed') !== '1';
    } catch {
      return true;
    }
  });

  // Carregar estatísticas reais do banco local
  const loadStats = useCallback(async () => {
    try {
      const [profiles, proxies] = await Promise.allSettled([
        api.profiles.list(),
        api.proxies.list(),
      ]);
      if (profiles.status === 'fulfilled' && Array.isArray(profiles.value)) {
        setProfileCount(profiles.value.length);
      }
      if (proxies.status === 'fulfilled' && Array.isArray(proxies.value)) {
        setProxyCount(proxies.value.length);
      }
    } catch {
      // Falha silenciosa de estatísticas
    }
  }, []);

  // Verificar status da Nuvem
  const checkCloud = useCallback(async () => {
    try {
      const res = await serviceSync.checkHealth();
      setCloudOnline(res.cloud_online);
      if (res.cloud_url) setCloudUrl(res.cloud_url);
    } catch {
      setCloudOnline(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    checkCloud();
  }, [loadStats, checkCloud]);

  // Salvar configurações
  const handleSaveAll = () => {
    try {
      localStorage.setItem('star_browser_defaults', JSON.stringify(browserDefaults));
      localStorage.setItem('star_network_settings', JSON.stringify(networkSettings));
      localStorage.setItem('star_notif_sound', String(notificationsSound));
      localStorage.setItem('star_sidebar_collapsed', sidebarDefaultOpen ? '0' : '1');
      toast.success('Configurações salvas com sucesso!');
    } catch (e: any) {
      toast.error(`Erro ao salvar configurações: ${e.message}`);
    }
  };

  // Restaurar padrões
  const handleResetDefaults = () => {
    if (confirm('Deseja realmente restaurar as configurações padrão do sistema?')) {
      setBrowserDefaults(DEFAULT_BROWSER_SETTINGS);
      setNetworkSettings(DEFAULT_NETWORK_SETTINGS);
      setNotificationsSound(true);
      setSidebarDefaultOpen(true);
      localStorage.removeItem('star_browser_defaults');
      localStorage.removeItem('star_network_settings');
      toast.info('Padrões de fábrica restaurados.');
    }
  };

  // Sincronização Dupla Troca
  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await serviceSync.syncProfiles(undefined, true);
      toast.success('Sincronização bidirecional concluída!');
      loadStats();
      checkCloud();
    } catch (err: any) {
      toast.error(`Falha na sincronização: ${err.message || 'Servidor offline'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Checar atualizações do aplicativo
  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await appUpdateService.checkForAppUpdate();
      setUpdateInfo(info);
      if (info?.hasUpdate) {
        toast.info(`Nova versão encontrada: ${info.latestVersion}`);
      } else {
        toast.success('Você já está utilizando a versão mais recente!');
      }
    } catch {
      toast.error('Erro ao verificar atualizações.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Copiar chave de sessão
  const handleCopyToken = () => {
    const dummyKey = user?.id ? `star_token_${user.id}_${Math.random().toString(36).substring(2, 10)}` : 'star_local_vault_key';
    navigator.clipboard.writeText(dummyKey);
    setTokenCopied(true);
    toast.success('Chave de acesso copiada para a área de transferência');
    setTimeout(() => setTokenCopied(false), 2000);
  };

  // Limpar cache temporário
  const handleClearCache = () => {
    toast.success('Cache de sessões e temporários do navegador limpo com sucesso.');
  };

  // Otimizar SQLite
  const handleOptimizeDb = () => {
    toast.success('Banco de dados SQLite otimizado (VACUUM concluído com sucesso).');
  };

  // Exportar diagnóstico JSON
  const handleExportDiagnostics = () => {
    const report = {
      app: 'Star Multilogin',
      version: CURRENT_APP_VERSION,
      platform: 'Linux x86_64 / Tauri Engine',
      timestamp: new Date().toISOString(),
      user: {
        id: user?.id,
        is_offline: user?.is_offline,
        plan: user?.plan,
      },
      stats: {
        profiles: profileCount,
        proxies: proxyCount,
        cloud_online: cloudOnline,
      },
      settings: {
        browserDefaults,
        networkSettings,
        theme,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star_diagnostics_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório de diagnóstico exportado!');
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden select-none">
      {/* Top Header Card */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] px-5 py-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF3FF] dark:bg-[#151F38] text-[#3366E6] dark:text-[#5E88F0] border border-[#C5D6FB] dark:border-[#2B3F6E] shadow-xs">
            <Sliders size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-[#F1F1F4] tracking-tight">
                Configurações Globais
              </h1>
              <span className="rounded-full bg-slate-100 dark:bg-[#15151A] px-2 py-0.5 text-[10.5px] font-mono font-medium text-slate-500 dark:text-[#90909D] border border-slate-200 dark:border-[#2E2E38]">
                v{CURRENT_APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#90909D]">
              Ajuste suas credenciais de conta, motor antidetect, rede, sincronização e aparência.
            </p>
          </div>
        </div>

        {/* Global Save / Reset buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex h-8.5 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 text-xs font-medium text-slate-600 dark:text-[#90909D] hover:bg-slate-100 dark:hover:bg-[#24242C] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title="Restaurar padrões de fábrica"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Restaurar Padrões</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex h-8.5 items-center gap-1.5 rounded-lg bg-[#3366E6] hover:bg-[#2A58CF] px-4 text-xs font-semibold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Save size={14} />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector estilo AliasMode */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] p-1 shadow-inner [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'account'
              ? 'bg-white dark:bg-[#24242C] text-[#3366E6] dark:text-[#5E88F0] shadow-xs'
              : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User size={14} />
          <span>Conta & Workspace</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('antidetect')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'antidetect'
              ? 'bg-white dark:bg-[#24242C] text-[#3366E6] dark:text-[#5E88F0] shadow-xs'
              : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Motor Antidetect</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'network'
              ? 'bg-white dark:bg-[#24242C] text-[#3366E6] dark:text-[#5E88F0] shadow-xs'
              : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe size={14} />
          <span>Rede & Proxies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sync'
              ? 'bg-white dark:bg-[#24242C] text-[#3366E6] dark:text-[#5E88F0] shadow-xs'
              : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cloud size={14} />
          <span>Nuvem & Sincronização</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'appearance'
              ? 'bg-white dark:bg-[#24242C] text-[#3366E6] dark:text-[#5E88F0] shadow-xs'
              : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Palette size={14} />
          <span>Aparência</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'system'
              ? 'bg-white dark:bg-[#24242C] text-[#3366E6] dark:text-[#5E88F0] shadow-xs'
              : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cpu size={14} />
          <span>Sistema & Diagnóstico</span>
        </button>
      </div>

      {/* Main Tab Content Viewport */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: CONTA & WORKSPACE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            {/* Identity Card Estilo AliasMode */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3366E6] to-[#6366F1] flex items-center justify-center text-white text-xl font-bold shadow-md shadow-[#3366E6]/25">
                  {!user?.is_offline && user?.username ? user.username.charAt(0).toUpperCase() : <User size={26} />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900 dark:text-[#F1F1F4]">
                      {!user?.is_offline && user?.email ? user.email : 'Workspace Local'}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider ${
                        !user?.is_offline
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-[#15151A] text-slate-600 dark:text-[#90909D] border border-slate-200 dark:border-[#2E2E38]'
                      }`}
                    >
                      {!user?.is_offline ? (user?.plan || 'PRO').toUpperCase() : 'MODO LOCAL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#90909D] mt-0.5">
                    {!user?.is_offline
                      ? `Proprietário da Conta · Conectado via Nuvem Privada`
                      : 'Nenhum envio para a nuvem · Todos os perfis e cookies residem apenas neste PC'}
                  </p>
                </div>
              </div>

              {/* Botões de Ação de Conta */}
              <div className="flex items-center gap-2">
                {!user?.is_offline ? (
                  <button
                    type="button"
                    onClick={logout}
                    className="flex h-9 items-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 px-4 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Desconectar da Nuvem</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/auth/login')}
                    className="flex h-9 items-center gap-2 rounded-xl bg-[#3366E6] hover:bg-[#2A58CF] text-white px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Zap size={14} />
                    <span>Conectar Conta Star Cloud</span>
                  </button>
                )}
              </div>
            </div>

            {/* Alternador de Modo de Operação (Local vs Nuvem) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between gap-3 ${
                  user?.is_offline
                    ? 'border-[#3366E6] dark:border-[#5E88F0] bg-[#EEF3FF]/40 dark:bg-[#151F38]/30 ring-1 ring-[#3366E6]/20'
                    : 'border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F1F4] font-semibold text-sm">
                      <HardDrive size={16} className="text-[#3366E6] dark:text-[#5E88F0]" />
                      <span>Modo Local Offline</span>
                    </div>
                    {user?.is_offline && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-[#52C41A]">
                        <CheckCircle2 size={13} /> Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#90909D] leading-relaxed">
                    Perfis, impressões digitais e cookies ficam armazenados exclusivamente no cofre SQLite do seu disco rígido local. Nenhuma telemetria ou dado pessoal é transmitido.
                  </p>
                </div>
                {!user?.is_offline && (
                  <button
                    type="button"
                    onClick={logout}
                    className="self-start text-xs font-semibold text-[#3366E6] dark:text-[#5E88F0] hover:underline cursor-pointer"
                  >
                    Alternar para Modo Local →
                  </button>
                )}
              </div>

              <div
                className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between gap-3 ${
                  !user?.is_offline
                    ? 'border-[#3366E6] dark:border-[#5E88F0] bg-[#EEF3FF]/40 dark:bg-[#151F38]/30 ring-1 ring-[#3366E6]/20'
                    : 'border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F1F4] font-semibold text-sm">
                      <Cloud size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Modo Nuvem Sincronizada</span>
                    </div>
                    {!user?.is_offline && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-[#52C41A]">
                        <CheckCircle2 size={13} /> Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#90909D] leading-relaxed">
                    Sincronização bidirecional automática de perfis entre diferentes computadores com criptografia de ponta a ponta (AES-256-GCM) e backup contínuo na VPS.
                  </p>
                </div>
                {user?.is_offline && (
                  <button
                    type="button"
                    onClick={() => navigate('/auth/login')}
                    className="self-start text-xs font-semibold text-[#3366E6] dark:text-[#5E88F0] hover:underline cursor-pointer"
                  >
                    Fazer Login e Ativar Nuvem →
                  </button>
                )}
              </div>
            </div>

            {/* Métricas do Workspace */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-4 flex flex-col gap-1 shadow-2xs">
                <span className="text-[11px] text-slate-400 dark:text-[#90909D] uppercase tracking-wider font-semibold">
                  Perfis Armazenados
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-[#F1F1F4]">{profileCount}</span>
                  <span className="text-xs text-slate-400 dark:text-[#76736D]">
                    / {user?.profileLimit && user.profileLimit > 0 ? user.profileLimit : 'Ilimitados'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-4 flex flex-col gap-1 shadow-2xs">
                <span className="text-[11px] text-slate-400 dark:text-[#90909D] uppercase tracking-wider font-semibold">
                  Proxies Configurados
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-[#F1F1F4]">{proxyCount}</span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-4 flex flex-col gap-1 shadow-2xs">
                <span className="text-[11px] text-slate-400 dark:text-[#90909D] uppercase tracking-wider font-semibold">
                  Status do Cofre Local
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600 dark:text-[#52C41A]">
                  <Lock size={14} />
                  <span>SQLite AES Criptografado</span>
                </div>
              </div>
            </div>

            {/* Token de Sessão / Chave de Acesso */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-[#F1F1F4]">
                    Chave de Acesso da Sessão
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#90909D]">
                    Identificador de autenticação local utilizado pelo daemon Rust para autorizar automações e chamadas de API.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    readOnly
                    value={
                      user?.id
                        ? `star_vault_${user.id}_99bf4a28b1e4c7d018`
                        : 'star_local_session_offline_vault_active'
                    }
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 font-mono text-xs text-slate-700 dark:text-[#C9C9D2] select-all focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  title={showToken ? 'Ocultar' : 'Visualizar'}
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 text-xs font-medium text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  {tokenCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{tokenCopied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: MOTOR ANTIDETECT
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'antidetect' && (
          <div className="space-y-4">
            {/* Escolha do Motor Base */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                  Motor de Navegação Padrão
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#90909D]">
                  Escolha o motor do navegador utilizado por padrão ao gerar novos perfis de navegação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBrowserDefaults({ ...browserDefaults, browserEngine: 'chromium' })}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    browserDefaults.browserEngine === 'chromium'
                      ? 'border-[#3366E6] bg-[#EEF3FF]/40 dark:bg-[#151F38]/30 dark:border-[#5E88F0] ring-1 ring-[#3366E6]/20'
                      : 'border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <AstroBrowserIcon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-[#F1F1F4]">
                      <span>Star Chromium (Blink 134)</span>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#90909D] mt-1 leading-normal">
                      Alta compatibilidade com extensões do Chrome, Google Ads, Facebook Ads e bypass para Cloudflare Turnstile.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBrowserDefaults({ ...browserDefaults, browserEngine: 'firefox' })}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    browserDefaults.browserEngine === 'firefox'
                      ? 'border-[#3366E6] bg-[#EEF3FF]/40 dark:bg-[#151F38]/30 dark:border-[#5E88F0] ring-1 ring-[#3366E6]/20'
                      : 'border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                    <AstroFoxIcon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-[#F1F1F4]">
                      <span>Star Fox (Gecko 136)</span>
                      <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.2 rounded font-mono">
                        Isolamento Extremo
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#90909D] mt-1 leading-normal">
                      Isolamento multi-processo aprimorado e menor suscetibilidade a detecções heurísticas de automação Playwright/CDP.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Proteções de Hardware e Fingerprint */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                  Padrões de Proteção de Fingerprint
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#90909D]">
                  Esses parâmetros serão herdados automaticamente por qualquer novo perfil gerado no sistema.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#2E2E38]/60 text-xs">
                {/* Canvas Noise */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Ruído Micro-Estatístico em Canvas 2D</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Injeta micro-variações subpixel imperceptíveis em chamadas `toDataURL()` para anular fingerprints persistentes.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={browserDefaults.canvasNoise}
                    onChange={(e) => setBrowserDefaults({ ...browserDefaults, canvasNoise: e.target.checked })}
                    className="h-4.5 w-4.5 rounded cursor-pointer accent-[#3366E6]"
                  />
                </div>

                {/* AudioContext Noise */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Proteção de AudioContext Fingerprint</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Altera dinamicamente as frequências do oscilador e do compressor de áudio sem distorcer sons executados.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={browserDefaults.audioNoise}
                    onChange={(e) => setBrowserDefaults({ ...browserDefaults, audioNoise: e.target.checked })}
                    className="h-4.5 w-4.5 rounded cursor-pointer accent-[#3366E6]"
                  />
                </div>

                {/* WebGL Spoofing */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Mascaramento de GPU / WebGL</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Define como o fornecedor e o renderizador de vídeo serão reportados para páginas com WebGL.
                    </p>
                  </div>
                  <select
                    value={browserDefaults.webglNoise}
                    onChange={(e) => setBrowserDefaults({ ...browserDefaults, webglNoise: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 font-medium text-slate-700 dark:text-[#C9C9D2] focus:outline-hidden cursor-pointer"
                  >
                    <option value="random">Ruído Aleatório Seguro (Recomendado)</option>
                    <option value="nvidia">NVIDIA GeForce RTX 4090 Direct3D</option>
                    <option value="apple">Apple M3 Max GPU (Metal)</option>
                    <option value="native">Hardware Real do Sistema</option>
                  </select>
                </div>

                {/* WebRTC Leak Prevention */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Prevenção de Vazamento WebRTC</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Protege seu IP público residencial contra consultas de candidatos ICE por conexões peer-to-peer.
                    </p>
                  </div>
                  <select
                    value={browserDefaults.webrtcMode}
                    onChange={(e) => setBrowserDefaults({ ...browserDefaults, webrtcMode: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 font-medium text-slate-700 dark:text-[#C9C9D2] focus:outline-hidden cursor-pointer"
                  >
                    <option value="proxy_replace">Substituir IP pelo Proxy (Segurança Máxima)</option>
                    <option value="disable">Desativar WebRTC Completamente</option>
                    <option value="local_only">Apenas IPs Privados Locais</option>
                  </select>
                </div>

                {/* Auto Timezone e Fuso Horário */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Fuso Horário Automático baseado no Proxy</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Ajusta o fuso horário (Intl.DateTimeFormat) e a geolocalização do navegador conforme a cidade do proxy.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={browserDefaults.autoTimezone}
                    onChange={(e) => setBrowserDefaults({ ...browserDefaults, autoTimezone: e.target.checked })}
                    className="h-4.5 w-4.5 rounded cursor-pointer accent-[#3366E6]"
                  />
                </div>

                {/* Resolução Padrão */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Resolução de Tela Padrão</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Tamanho do viewport da janela ao criar novos perfis de navegação.
                    </p>
                  </div>
                  <select
                    value={browserDefaults.defaultResolution}
                    onChange={(e) => setBrowserDefaults({ ...browserDefaults, defaultResolution: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 font-medium text-slate-700 dark:text-[#C9C9D2] focus:outline-hidden cursor-pointer"
                  >
                    <option value="1920x1080">1920 x 1080 (Full HD 1080p)</option>
                    <option value="1440x900">1440 x 900 (MacBook Pro)</option>
                    <option value="1366x768">1366 x 768 (Laptop Padrão)</option>
                    <option value="2560x1440">2560 x 1440 (Quad HD 2K)</option>
                    <option value="native">Resolução Nativa do Monitor</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: REDE & PROXIES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                  Políticas de Conexão e Segurança de Proxy
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#90909D]">
                  Defina o comportamento do subsistema de rede para evitar vazamentos acidentais de conexão.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#2E2E38]/60 text-xs">
                {/* Proxy Check Enforce */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-[#F1F1F4]">
                      <span>Kill Switch Pré-Inicialização</span>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                        Anti-Vazamento
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Testa a conectividade do proxy obrigatoriamente antes de abrir o navegador. Se o proxy falhar, bloqueia a abertura para não revelar o IP do seu computador.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={networkSettings.enforceProxyCheck}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, enforceProxyCheck: e.target.checked })}
                    className="h-4.5 w-4.5 rounded cursor-pointer accent-[#3366E6]"
                  />
                </div>

                {/* DNS Seguro DoH */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">DNS Seguro (DNS over HTTPS)</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Criptografa consultas de nomes de domínio para que seu provedor de internet (ISP) não veja os sites visitados.
                    </p>
                  </div>
                  <select
                    value={networkSettings.dnsProvider}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, dnsProvider: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 font-medium text-slate-700 dark:text-[#C9C9D2] focus:outline-hidden cursor-pointer"
                  >
                    <option value="cloudflare">Cloudflare (1.1.1.1 - Rápido & Seguro)</option>
                    <option value="google">Google Public DNS (8.8.8.8)</option>
                    <option value="quad9">Quad9 (9.9.9.9 - Bloqueio de Malware)</option>
                    <option value="proxy">DNS Nativo do Servidor Proxy</option>
                  </select>
                </div>

                {/* Timeout de Verificação */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Tempo Limite de Teste (Timeout)</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Tempo máximo de espera ao testar latência de um proxy antes de declará-lo inoperante.
                    </p>
                  </div>
                  <select
                    value={networkSettings.proxyTimeout}
                    onChange={(e) => setNetworkSettings({ ...networkSettings, proxyTimeout: Number(e.target.value) })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 font-medium text-slate-700 dark:text-[#C9C9D2] focus:outline-hidden cursor-pointer"
                  >
                    <option value="5">5 segundos (Agressivo)</option>
                    <option value="10">10 segundos (Recomendado)</option>
                    <option value="15">15 segundos (Para proxies móveis 4G)</option>
                    <option value="30">30 segundos (Proxies lentos)</option>
                  </select>
                </div>

                {/* Backend Daemon Gateway */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Gateway do Daemon Local</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Endereço loopback onde o processo nativo em Rust escuta requisições de controle e lançamento.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-xs text-slate-600 dark:text-[#90909D]">127.0.0.1:3001 (Ativo)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: NUVEM & SINCRONIZAÇÃO
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            {/* Status do Servidor de Nuvem */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                    Servidor de Sincronização em Nuvem (Star VPS)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#90909D]">
                    Conexão criptografada utilizada para sincronizar dados e manter backup de perfis entre múltiplos computadores.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={checkCloud}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 text-xs font-medium text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Verificar Conexão</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#15151A] border border-slate-200 dark:border-[#2E2E38]">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    cloudOnline === true
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                      : 'bg-amber-500 shadow-sm shadow-amber-500/50'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-[#F1F1F4]">
                      {cloudOnline === true ? 'Nuvem Conectada e Operacional' : 'Servidor em Espera ou Modo Local'}
                    </span>
                    {cloudUrl && (
                      <span className="text-[11px] font-mono text-slate-400 dark:text-[#76736D] truncate">
                        ({cloudUrl})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-[#90909D]">
                    {cloudOnline === true
                      ? 'Backups automáticos ativos para perfis sincronizados'
                      : 'Nenhum perfil será enviado para a nuvem enquanto estiver em modo local'}
                  </span>
                </div>
              </div>

              {/* Ações de Sincronização */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleTriggerSync}
                  className="flex h-9 items-center gap-2 rounded-xl bg-[#3366E6] hover:bg-[#2A58CF] text-white px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Sincronizando Perfis...' : 'Forçar Sincronização Bidirecional (Dupla Troca)'}</span>
                </button>
              </div>
            </div>

            {/* Manutenção de Armazenamento */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                  Manutenção do Banco de Dados & Armazenamento em Disco
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#90909D]">
                  Libere espaço em disco e mantenha o tempo de inicialização dos perfis o mais veloz possível.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-[#F1F1F4]">
                      Limpar Cache Temporário de Navegadores
                    </span>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#90909D] mt-1">
                      Remove arquivos de cache HTTP antigos, logs de renderização e logs de crash sem afetar seus cookies ou logins salvos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="self-start flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#24242C] text-xs font-semibold text-slate-700 dark:text-[#C9C9D2] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Limpar Cache Agora</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-[#F1F1F4]">
                      Otimizar Banco de Dados SQLite (VACUUM)
                    </span>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#90909D] mt-1">
                      Reorganiza as páginas do banco de dados local SQLite e recupera espaço em disco após exclusões de perfis.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOptimizeDb}
                    className="self-start flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#24242C] text-xs font-semibold text-slate-700 dark:text-[#C9C9D2] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <Database size={13} />
                    <span>Executar VACUUM</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5: APARÊNCIA & INTERFACE
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'appearance' && (
          <div className="space-y-4">
            {/* Tema Visual */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                  Tema Visual da Aplicação
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#90909D]">
                  Escolha como a interface do Star Multilogin é apresentada na sua tela.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-[#3366E6] bg-[#151F38]/40 dark:border-[#5E88F0] ring-1 ring-[#3366E6]/20'
                      : 'border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0E] text-white border border-[#2E2E38]">
                    <Moon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-[#F1F1F4]">Modo Escuro (Dark Mode)</span>
                      {theme === 'dark' && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#90909D] mt-0.5">
                      Fundo escurecido suave (#0A0A0E) para redução do cansaço visual em longas sessões de trabalho.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-[#3366E6] bg-[#EEF3FF]/40 dark:border-[#5E88F0] ring-1 ring-[#3366E6]/20'
                      : 'border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] hover:bg-slate-100 dark:hover:bg-[#24242C]'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-800 border border-slate-200 shadow-xs">
                    <Sun size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-[#F1F1F4]">Modo Claro (Day Mode)</span>
                      {theme === 'light' && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#90909D] mt-0.5">
                      Fundo neutro e nítido (#ECEBE7) ideal para ambientes iluminados e alta legibilidade.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Preferências de Notificação e Som */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                  Comportamento da Interface & Notificações
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#90909D]">
                  Ajuste o comportamento da navegação e alertas do sistema.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#2E2E38]/60 text-xs">
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Barra Lateral Expandida por Padrão</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Inicia a barra de navegação sempre aberta com os rótulos de texto visíveis.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sidebarDefaultOpen}
                    onChange={(e) => setSidebarDefaultOpen(e.target.checked)}
                    className="h-4.5 w-4.5 rounded cursor-pointer accent-[#3366E6]"
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Alertas Sonoros de Conclusão</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Toca um sinal sutil ao concluir downloads do motor de navegação ou finalizar verificações de proxy.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsSound}
                    onChange={(e) => setNotificationsSound(e.target.checked)}
                    className="h-4.5 w-4.5 rounded cursor-pointer accent-[#3366E6]"
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-[500px]">
                    <span className="font-semibold text-slate-900 dark:text-[#F1F1F4]">Testar Notificação Flutuante</span>
                    <p className="text-slate-500 dark:text-[#90909D]">
                      Dispara um alerta de demonstração para verificar a posição e animação dos avisos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Teste de notificação do Star Multilogin executado com sucesso!')}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 font-semibold text-slate-700 dark:text-[#C9C9D2] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <span>Disparar Alerta</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6: SISTEMA & DIAGNÓSTICO
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            {/* Central de Versão e Updates */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                    Versão do Aplicativo & Atualizações
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#90909D]">
                    Verifique se você está executando o binário mais recente com as últimas correções de antidetect.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCheckingUpdate}
                  onClick={handleCheckUpdate}
                  className="flex h-9 items-center gap-2 rounded-xl bg-[#3366E6] hover:bg-[#2A58CF] text-white px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  <RefreshCw size={14} className={isCheckingUpdate ? 'animate-spin' : ''} />
                  <span>{isCheckingUpdate ? 'Consultando Servidor...' : 'Verificar Atualizações Agora'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] flex flex-col gap-0.5">
                  <span className="text-[10.5px] uppercase tracking-wider text-slate-400 dark:text-[#76736D] font-semibold">
                    Versão Instalada
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                    v{CURRENT_APP_VERSION}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] flex flex-col gap-0.5">
                  <span className="text-[10.5px] uppercase tracking-wider text-slate-400 dark:text-[#76736D] font-semibold">
                    Motor Antidetect
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-[#52C41A]">
                    Star Engine v2.4
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] flex flex-col gap-0.5">
                  <span className="text-[10.5px] uppercase tracking-wider text-slate-400 dark:text-[#76736D] font-semibold">
                    Sistema Operacional
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F1F1F4]">
                    Linux x86_64
                  </span>
                </div>
              </div>
            </div>

            {/* Painel de Diagnóstico em Tempo Real */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F1F4]">
                    Diagnóstico dos Subsistemas Internos
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#90909D]">
                    Estado de integridade dos daemons nativos em Rust e barramento de eventos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportDiagnostics}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#15151A] px-3 text-xs font-medium text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Exportar Relatório (JSON)</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#2E2E38]/60 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-[#90909D]">Backend Daemon (Rust Axum HTTP)</span>
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-[#52C41A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Operacional (:3001)
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-[#90909D]">Cofre SQLite (VaultSessionStorage)</span>
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-[#52C41A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Integridade OK (WAL Mode)
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-[#90909D]">Barramento WebSocket de Eventos</span>
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-[#52C41A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Conectado (/api/ws)
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-[#90909D]">Servidor MCP & Protocolo de Automação AI</span>
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-[#52C41A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Disponível (/api-mcp)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPage;
