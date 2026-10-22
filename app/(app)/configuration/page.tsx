import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { serviceSync } from '@/services/sync/service.sync';
import { appUpdateService, CURRENT_APP_VERSION } from '@/services/app-update/service.update';
import { toast } from '@/components/ui/notification';
import { AstroBrowserIcon, AstroFoxIcon } from '@/components/icons';

type ConfigTab = 'account' | 'browser' | 'network' | 'appearance';

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
        ? 'bg-[#3366E6] shadow-[0_0_10px_rgba(51,102,230,0.35)]'
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
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<ConfigTab>('account');
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
              onClick={() => setActiveTab(tab.id as ConfigTab)}
              className={`relative flex items-center gap-2 cursor-pointer pb-3 text-[13.5px] tracking-wide transition-all ${
                isActive
                  ? 'font-semibold text-slate-900 dark:text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2.5px] after:rounded-t-sm after:bg-[#3366E6] dark:after:bg-[#5E88F0] after:content-[""]'
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
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#3366E6] to-[#6366F1] text-white text-base font-bold shadow-md shadow-[#3366E6]/25">
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
                      className="flex h-8.5 items-center gap-1.5 rounded-lg bg-[#3366E6] hover:bg-[#2A58CF] text-white px-3.5 text-xs font-medium shadow-xs transition-all cursor-pointer active:scale-[0.98]"
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
            ABA 2: NAVEGADOR & ANTIDETECT
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'browser' && (
          <div className="max-w-3xl space-y-4">
            {/* Escolha do Motor Base */}
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
                  onClick={() => setBrowserSettings({ ...browserSettings, engine: 'chromium' })}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    browserSettings.engine === 'chromium'
                      ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#24252D] ring-2 ring-[#3366E6]/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:border-slate-300 dark:hover:border-[#434555]'
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
                    <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5 leading-relaxed">
                      Baseado em Chromium com bypass anti-detecção e suporte completo à Chrome Web Store.
                    </p>
                  </div>
                </div>

                {/* Card Firefox */}
                <div
                  onClick={() => setBrowserSettings({ ...browserSettings, engine: 'firefox' })}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    browserSettings.engine === 'firefox'
                      ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#24252D] ring-2 ring-[#3366E6]/20 shadow-xs'
                      : 'border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:border-slate-300 dark:hover:border-[#434555]'
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
                    <p className="text-[11.5px] text-slate-500 dark:text-[#8E92A2] mt-0.5 leading-relaxed">
                      Motor Gecko com isolamento estrito de processos e proteção avançada de memória.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proteções de Antidetecção */}
            <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] p-5 space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  Proteções de Impressão Digital (Fingerprint)
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-0.5">
                  Parâmetros de camuflagem ativados automaticamente para cada perfil gerado.
                </p>
              </div>

              <div className="divide-y divide-slate-200/60 dark:divide-[#30323E] text-xs">
                {/* Canvas Noise */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Ruído de Canvas 2D</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Injeta micro-ruído imperceptível para impedir rastreamento persistente por Canvas hash.
                    </p>
                  </div>
                  <Switch
                    checked={browserSettings.canvasNoise}
                    onChange={(val) => setBrowserSettings({ ...browserSettings, canvasNoise: val })}
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
                    checked={browserSettings.audioNoise}
                    onChange={(val) => setBrowserSettings({ ...browserSettings, audioNoise: val })}
                  />
                </div>

                {/* WebRTC Leak */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Prevenção de Vazamento WebRTC</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Substitui o IP real pelo IP do proxy nas conexões peer-to-peer WebRTC.
                    </p>
                  </div>
                  <Switch
                    checked={browserSettings.webrtcProtect}
                    onChange={(val) => setBrowserSettings({ ...browserSettings, webrtcProtect: val })}
                  />
                </div>

                {/* Auto Timezone */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Fuso Horário Automático por IP</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Ajusta o fuso horário e a localização geográfica conforme a cidade do proxy conectado.
                    </p>
                  </div>
                  <Switch
                    checked={browserSettings.autoTimezone}
                    onChange={(val) => setBrowserSettings({ ...browserSettings, autoTimezone: val })}
                  />
                </div>

                {/* Resolução de Tela Padrão */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">Resolução de Tela Padrão</span>
                    <p className="text-slate-500 dark:text-[#8E92A2]">
                      Dimensões da janela gerada para novos perfis.
                    </p>
                  </div>
                  <select
                    value={browserSettings.screenResolution}
                    onChange={(e) => setBrowserSettings({ ...browserSettings, screenResolution: e.target.value })}
                    className="h-8.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] px-3 font-medium text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="1920x1080">1920 x 1080 (Full HD)</option>
                    <option value="1440x900">1440 x 900 (MacBook Pro)</option>
                    <option value="1366x768">1366 x 768 (Laptop)</option>
                    <option value="2560x1440">2560 x 1440 (Quad HD 2K)</option>
                  </select>
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
                      ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#24252D] ring-2 ring-[#3366E6]/20 shadow-xs'
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
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3366E6] text-white">
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
                      ? 'border-[#3366E6] dark:border-[#5E88F0] bg-white dark:bg-[#24252D] ring-2 ring-[#3366E6]/20 shadow-xs'
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
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3366E6] text-white">
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
          className="flex items-center gap-2 cursor-pointer rounded-md bg-[#3366E6] hover:bg-[#2A58CF] text-white px-7 py-2 text-[13px] font-medium shadow-xs transition-all select-none active:scale-[0.98]"
        >
          <Save size={14} />
          <span>Salvar Alterações</span>
        </button>
      </div>
    </div>
  );
};

export default ConfigurationPage;
