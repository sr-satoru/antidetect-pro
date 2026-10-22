import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Globe,
  Palette,
  Cloud,
  RefreshCw,
  LogOut,
  Zap,
  Check,
  Save,
  RotateCcw,
  Sun,
  Moon,
  ChevronRight,
  Download,
  Sliders,
  CheckCircle2,
  HardDrive,
  Lock,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { serviceSync } from '@/services/sync/service.sync';
import { appUpdateService, CURRENT_APP_VERSION } from '@/services/app-update/service.update';
import { toast } from '@/components/ui/notification';
import { AstroBrowserIcon, AstroFoxIcon } from '@/components/icons';

type ConfigSection = 'account' | 'browser' | 'network' | 'appearance';

interface BrowserSettings {
  engine: 'chromium' | 'firefox';
  canvasNoise: boolean;
  audioNoise: boolean;
  webrtcProtect: boolean;
  autoTimezone: boolean;
  webglRenderer: string;
  screenResolution: string;
}

interface NetworkSettings {
  enforceProxyCheck: boolean;
  dnsProvider: string;
  proxyTimeout: number;
}

const DEFAULT_BROWSER: BrowserSettings = {
  engine: 'chromium',
  canvasNoise: true,
  audioNoise: true,
  webrtcProtect: true,
  autoTimezone: true,
  webglRenderer: 'random',
  screenResolution: '1920x1080',
};

const DEFAULT_NETWORK: NetworkSettings = {
  enforceProxyCheck: true,
  dnsProvider: 'cloudflare',
  proxyTimeout: 10,
};

// Toggle Switch estilo Linear / Apple UI
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
        ? 'bg-[#3366E6] shadow-[0_0_10px_rgba(51,102,230,0.4)]'
        : 'bg-slate-200 dark:bg-[#2C2E3B]'
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
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<ConfigSection>('account');
  const [cloudOnline, setCloudOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Browser settings
  const [browserSettings, setBrowserSettings] = useState<BrowserSettings>(() => {
    try {
      const saved = localStorage.getItem('star_browser_defaults');
      return saved ? { ...DEFAULT_BROWSER, ...JSON.parse(saved) } : DEFAULT_BROWSER;
    } catch {
      return DEFAULT_BROWSER;
    }
  });

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
      localStorage.setItem('star_browser_defaults', JSON.stringify(browserSettings));
      localStorage.setItem('star_network_settings', JSON.stringify(networkSettings));
      localStorage.setItem('star_notif_sound', String(soundEnabled));
      toast.success('Configurações salvas com sucesso');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar as configurações padrão de fábrica?')) {
      setBrowserSettings(DEFAULT_BROWSER);
      setNetworkSettings(DEFAULT_NETWORK);
      setSoundEnabled(true);
      localStorage.removeItem('star_browser_defaults');
      localStorage.removeItem('star_network_settings');
      toast.info('Configurações padrão restauradas');
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await serviceSync.syncProfiles(undefined, true);
      toast.success('Sincronização bidirecional concluída');
    } catch {
      toast.error('Erro ao sincronizar com o servidor');
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

  const navItems = [
    {
      id: 'account',
      title: 'Conta & Nuvem',
      desc: 'Sessão, plano e sincronização',
      icon: User,
    },
    {
      id: 'browser',
      title: 'Motor Antidetect',
      desc: 'Chromium, Firefox e fingerprints',
      icon: ShieldCheck,
    },
    {
      id: 'network',
      title: 'Rede & Proxies',
      desc: 'Kill-switch, DNS e conexões',
      icon: Globe,
    },
    {
      id: 'appearance',
      title: 'Geral & Aparência',
      desc: 'Tema, interface e versão',
      icon: Palette,
    },
  ] as const;

  return (
    <div className="flex h-full w-full overflow-hidden rounded-xl border border-slate-200 dark:border-[#262833] bg-white dark:bg-[#14151B] shadow-xl shadow-slate-900/5 dark:shadow-2xl select-none">
      {/* ═══════════════════════════════════════════════════════════════
          COLUNA ESQUERDA: Navegação Vertical estilo Linear / Raycast UI
      ═══════════════════════════════════════════════════════════════ */}
      <aside className="w-60 md:w-64 shrink-0 flex flex-col justify-between border-r border-slate-200 dark:border-[#22242D] bg-slate-50/50 dark:bg-[#101116] p-4 select-none">
        <div className="space-y-4">
          {/* Header da Sidebar */}
          <div className="px-2 pt-1">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm tracking-tight">
              <Sliders size={16} className="text-[#3366E6] dark:text-[#5E88F0]" />
              <span>Configurações</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#787B8D] mt-0.5">
              Preferências do Star Multilogin
            </p>
          </div>

          {/* Lista de Navegação */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id as ConfigSection)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#1A1C24] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2E303E] shadow-2xs'
                      : 'text-slate-600 dark:text-[#8E92A2] hover:bg-slate-100/70 dark:hover:bg-[#181920] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors shrink-0 ${
                        isActive
                          ? 'bg-[#EEF3FF] dark:bg-[#151F38] text-[#3366E6] dark:text-[#5E88F0]'
                          : 'text-slate-400 dark:text-[#6C7082]'
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className={`text-xs truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-[#6C7082] truncate">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight size={13} className="text-[#3366E6] dark:text-[#5E88F0] shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-2.5 rounded-lg border border-slate-200/80 dark:border-[#22242D] bg-white dark:bg-[#15161D]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-[#A9ACB9]">Star Engine</span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-[#6C7082]">v{CURRENT_APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-600 dark:text-[#52C41A] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cofre SQLite Operacional</span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          COLUNA DIREITA: Conteúdo Principal com Topbar e Cards
      ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white dark:bg-[#14151B]">
        {/* Barra Superior do Conteúdo com Botões de Ação */}
        <header className="h-[58px] shrink-0 border-b border-slate-200 dark:border-[#22242D] px-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {navItems.find((n) => n.id === activeSection)?.title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-[#787B8D]">
              {navItems.find((n) => n.id === activeSection)?.desc}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#2A2C37] bg-white dark:bg-[#181921] px-3 text-xs font-medium text-slate-600 dark:text-[#9EA2B3] hover:bg-slate-100 dark:hover:bg-[#22232E] transition-all cursor-pointer select-none"
            >
              <RotateCcw size={12} />
              <span>Restaurar</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex h-8 items-center gap-1.5 rounded-md bg-[#3366E6] hover:bg-[#2A58CF] text-white px-4 text-xs font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer select-none"
            >
              <Save size={13} />
              <span>Salvar</span>
            </button>
          </div>
        </header>

        {/* Área de Formulários e Cards (Scroll) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl custom-scrollbar">
          {/* ─────────────────────────────────────────────────────────────
              SEÇÃO: CONTA & NUVEM
          ───────────────────────────────────────────────────────────── */}
          {activeSection === 'account' && (
            <div className="space-y-4">
              {/* Card de Identidade do Usuário */}
              <div className="rounded-xl border border-slate-200 dark:border-[#262833] bg-slate-50/60 dark:bg-[#191A22] p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#3366E6] to-[#6366F1] text-white text-base font-bold shadow-md shadow-[#3366E6]/20">
                      {!user?.is_offline && user?.email
                        ? (user?.username ? user.username.charAt(0).toUpperCase() : 'U')
                        : <User size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {!user?.is_offline && user?.email ? user.email : 'Workspace Local'}
                        </span>
                        <span className="rounded-full bg-slate-200/80 dark:bg-[#282A35] px-2 py-0.2 text-[10px] font-semibold text-slate-700 dark:text-[#A7AAB9]">
                          {!user?.is_offline ? (user?.plan || 'PRO').toUpperCase() : 'OFFLINE'}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5">
                        {!user?.is_offline
                          ? 'Conectado à nuvem privada com sincronização de perfis ativa'
                          : 'Modo Local Isolado · Perfis armazenados exclusivamente no disco rígido deste computador'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {!user?.is_offline ? (
                      <button
                        type="button"
                        onClick={logout}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-500/10 px-3 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        <LogOut size={13} />
                        <span>Desconectar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/auth/login')}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-[#3366E6] hover:bg-[#2A58CF] text-white px-3.5 text-xs font-medium shadow-xs transition-all cursor-pointer"
                      >
                        <Zap size={13} />
                        <span>Conectar Nuvem</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card de Sincronização em Nuvem */}
              <div className="rounded-xl border border-slate-200 dark:border-[#262833] bg-slate-50/60 dark:bg-[#191A22] p-5 space-y-3.5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                    Sincronização em Nuvem (VPS Star)
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5">
                    Mantenha seus perfis, proxies e extensões sincronizados entre múltiplos computadores com criptografia de ponta a ponta.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-white dark:bg-[#14151B] border border-slate-200/90 dark:border-[#2A2C37]">
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
                      <p className="text-[10.5px] text-slate-500 dark:text-[#8E92A2]">
                        Criptografia AES-256 no backend nativo em Rust
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSyncNow}
                    className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#2E303E] bg-slate-50 dark:bg-[#1A1C24] px-3 text-xs font-medium text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#252732] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SEÇÃO: MOTOR ANTIDETECT
          ───────────────────────────────────────────────────────────── */}
          {activeSection === 'browser' && (
            <div className="space-y-4">
              {/* Seleção do Motor Base */}
              <div className="rounded-xl border border-slate-200 dark:border-[#262833] bg-slate-50/60 dark:bg-[#191A22] p-5 space-y-3.5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                    Motor de Navegação Padrão
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5">
                    Núcleo utilizado ao criar novos perfis de navegação.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card Chromium */}
                  <div
                    onClick={() => setBrowserSettings({ ...browserSettings, engine: 'chromium' })}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      browserSettings.engine === 'chromium'
                        ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#14151B] ring-2 ring-[#3366E6]/20 shadow-xs'
                        : 'border-slate-200 dark:border-[#2A2C37] bg-white dark:bg-[#14151B] hover:border-slate-300 dark:hover:border-[#383A49]'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <AstroBrowserIcon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          Star Chromium
                        </span>
                        {browserSettings.engine === 'chromium' && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3366E6] text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2] mt-0.5 leading-relaxed">
                        Compatibilidade completa com extensões Chrome, Google Ads e Facebook Ads.
                      </p>
                    </div>
                  </div>

                  {/* Card Firefox */}
                  <div
                    onClick={() => setBrowserSettings({ ...browserSettings, engine: 'firefox' })}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      browserSettings.engine === 'firefox'
                        ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#14151B] ring-2 ring-[#3366E6]/20 shadow-xs'
                        : 'border-slate-200 dark:border-[#2A2C37] bg-white dark:bg-[#14151B] hover:border-slate-300 dark:hover:border-[#383A49]'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                      <AstroFoxIcon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          Star Fox
                        </span>
                        {browserSettings.engine === 'firefox' && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3366E6] text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2] mt-0.5 leading-relaxed">
                        Motor Gecko com isolamento estrito de memória e evasão avançada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Proteções de Fingerprint */}
              <div className="rounded-xl border border-slate-200 dark:border-[#262833] bg-slate-50/60 dark:bg-[#191A22] p-5 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                    Proteções de Impressão Digital (Fingerprint)
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5">
                    Mecanismos de ruído matemático para invalidar rastreadores heurísticos.
                  </p>
                </div>

                <div className="divide-y divide-slate-200/70 dark:divide-[#262833] text-xs">
                  {/* Canvas */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Ruído de Canvas 2D</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Injeta variações subpixel para anular hashes de canvas sem distorcer páginas.
                      </p>
                    </div>
                    <Switch
                      checked={browserSettings.canvasNoise}
                      onChange={(val) => setBrowserSettings({ ...browserSettings, canvasNoise: val })}
                    />
                  </div>

                  {/* Audio */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Ruído de AudioContext</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Protege frequências do oscilador de áudio contra identificação estática.
                      </p>
                    </div>
                    <Switch
                      checked={browserSettings.audioNoise}
                      onChange={(val) => setBrowserSettings({ ...browserSettings, audioNoise: val })}
                    />
                  </div>

                  {/* WebRTC */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Prevenção de Vazamento WebRTC</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Substitui o IP real pelo IP do proxy em chamadas WebRTC peer-to-peer.
                      </p>
                    </div>
                    <Switch
                      checked={browserSettings.webrtcProtect}
                      onChange={(val) => setBrowserSettings({ ...browserSettings, webrtcProtect: val })}
                    />
                  </div>

                  {/* Fuso Horário */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Fuso Horário & Idioma Automático</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Sincroniza o timezone e headers Accept-Language conforme a localização do proxy.
                      </p>
                    </div>
                    <Switch
                      checked={browserSettings.autoTimezone}
                      onChange={(val) => setBrowserSettings({ ...browserSettings, autoTimezone: val })}
                    />
                  </div>

                  {/* Resolução */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Resolução de Tela Padrão</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Dimensões da janela gerada para novos perfis.
                      </p>
                    </div>
                    <select
                      value={browserSettings.screenResolution}
                      onChange={(e) => setBrowserSettings({ ...browserSettings, screenResolution: e.target.value })}
                      className="h-8 rounded-lg border border-slate-200 dark:border-[#2C2E3C] bg-white dark:bg-[#14151B] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="1920x1080">1920 x 1080 (Full HD)</option>
                      <option value="1440x900">1440 x 900 (MacBook Pro)</option>
                      <option value="1366x768">1366 x 768 (Laptop)</option>
                      <option value="2560x1440">2560 x 1440 (2K)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SEÇÃO: REDE & PROXIES
          ───────────────────────────────────────────────────────────── */}
          {activeSection === 'network' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-[#262833] bg-slate-50/60 dark:bg-[#191A22] p-5 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                    Políticas de Conexão e Proteção de Proxy
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5">
                    Evite que sites descubram seu IP residencial em caso de queda na rota do proxy.
                  </p>
                </div>

                <div className="divide-y divide-slate-200/70 dark:divide-[#262833] text-xs">
                  {/* Kill Switch */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Kill-Switch de Inicialização</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Bloqueia a abertura do perfil caso o proxy configurado esteja offline ou instável.
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
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Criptografa consultas de domínios evitando vazamento de nomes (DNS Leak).
                      </p>
                    </div>
                    <select
                      value={networkSettings.dnsProvider}
                      onChange={(e) => setNetworkSettings({ ...networkSettings, dnsProvider: e.target.value })}
                      className="h-8 rounded-lg border border-slate-200 dark:border-[#2C2E3C] bg-white dark:bg-[#14151B] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
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
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Tempo máximo para validar a latência do proxy antes de declarar erro.
                      </p>
                    </div>
                    <select
                      value={networkSettings.proxyTimeout}
                      onChange={(e) => setNetworkSettings({ ...networkSettings, proxyTimeout: Number(e.target.value) })}
                      className="h-8 rounded-lg border border-slate-200 dark:border-[#2C2E3C] bg-white dark:bg-[#14151B] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
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
              SEÇÃO: GERAL & APARÊNCIA
          ───────────────────────────────────────────────────────────── */}
          {activeSection === 'appearance' && (
            <div className="space-y-4">
              {/* Tema Visual */}
              <div className="rounded-xl border border-slate-200 dark:border-[#262833] bg-slate-50/60 dark:bg-[#191A22] p-5 space-y-3.5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                    Tema da Interface
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5">
                    Alterne o modo visual para conforto no uso prolongado.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#14151B] ring-2 ring-[#3366E6]/20 shadow-xs'
                        : 'border-slate-200 dark:border-[#2A2C37] bg-white dark:bg-[#14151B] hover:border-slate-300 dark:hover:border-[#383A49]'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0E] text-white border border-[#2A2C37]">
                      <Moon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">Modo Escuro</span>
                        {theme === 'dark' && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3366E6] text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">Contraste refinado para baixa luminosidade</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#14151B] ring-2 ring-[#3366E6]/20 shadow-xs'
                        : 'border-slate-200 dark:border-[#2A2C37] bg-white dark:bg-[#14151B] hover:border-slate-300 dark:hover:border-[#383A49]'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      <Sun size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">Modo Claro</span>
                        {theme === 'light' && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3366E6] text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">Ambiente nítido e iluminado</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferências de Sistema */}
              <div className="rounded-xl border border-slate-200 dark:border-[#262833] bg-slate-50/60 dark:bg-[#191A22] p-5 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                    Preferências & Atualizações
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5">
                    Notificações de sistema e atualizações do executável.
                  </p>
                </div>

                <div className="divide-y divide-slate-200/70 dark:divide-[#262833] text-xs">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Sons de Alerta</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Reproduz um sinal sutil ao concluir downloads ou verificações.
                      </p>
                    </div>
                    <Switch
                      checked={soundEnabled}
                      onChange={(val) => setSoundEnabled(val)}
                    />
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">Versão do Star Multilogin</span>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E92A2]">
                        Compilação atual: <span className="font-mono text-slate-700 dark:text-[#C4C7D5]">v{CURRENT_APP_VERSION}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isCheckingUpdate}
                      onClick={handleCheckUpdate}
                      className="flex h-7.5 items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#2C2E3C] bg-white dark:bg-[#14151B] px-3 font-medium text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#20222D] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Download size={12} className={isCheckingUpdate ? 'animate-bounce' : ''} />
                      <span>{isCheckingUpdate ? 'Verificando...' : 'Verificar Atualizações'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ConfigurationPage;
