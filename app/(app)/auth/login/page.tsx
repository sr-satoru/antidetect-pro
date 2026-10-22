import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import {
  Star,
  LogIn,
  Loader2,
  ExternalLink,
  X,
  ArrowRight,
  ArrowLeft,
  Cloud,
  ShieldCheck,
  Cpu,
  Zap,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';
import servicePerfis from '@/services/perfis/service.perfis';
import { serviceAuth } from '@/services/auth/service.auth';

interface PendingAuthSession {
  sessionId: string;
  action: 'login' | 'register';
  authUrl: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCloudSession } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [waitingSession, setWaitingSession] = useState<PendingAuthSession | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling para detectar quando a autorização for concluída no navegador
  useEffect(() => {
    if (!waitingSession) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const checkSession = async () => {
      try {
        const data = await serviceAuth.getSessionStatus(waitingSession.sessionId);
        if (data.status === 'authenticated' && data.user && data.token) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          setCloudSession(data.user, data.token);
          toast.success(`Conectado com sucesso como ${data.user.email || 'usuário'}!`);
          setWaitingSession(null);
          // Dispara a Dupla Troca em segundo plano ao confirmar o login
          servicePerfis.twoWaySync().catch((err) => {
            console.warn('Sync em segundo plano no login:', err);
          });
          navigate('/perfis');
        }
      } catch (err) {
        console.error('Erro ao consultar status da sessão:', err);
      }
    };

    pollIntervalRef.current = setInterval(checkSession, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [waitingSession, navigate, setCloudSession]);

  // Cancelar espera de autorização
  const handleCancelWaiting = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setWaitingSession(null);
  };

  // Voltar para Perfis cancelando qualquer espera em andamento
  const handleGoBack = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    navigate('/perfis');
  };

  // Iniciar fluxo de CONEXÃO no navegador via OAuth 2.0 PKCE
  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const data = await serviceAuth.startLogin();
      window.open(data.auth_url, '_blank', 'noopener,noreferrer');

      setWaitingSession({
        sessionId: data.session_id,
        action: 'login',
        authUrl: data.auth_url,
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conectar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex flex-col bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-[#E1E4EA] select-none overflow-x-hidden font-sans">
      {/* Header superior da página centralizado */}
      <header className="relative z-10 w-full h-16 border-b border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED] text-white shadow-xs hover:shadow-[0_0_12px_rgba(124,58,237,0.3)]">
            <Star size={18} className="fill-white stroke-white" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">One Star Multilogin</span>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#282A33] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-[#9DA2B4]">
              Conta & Nuvem
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal da Página: Layout 2 Colunas (Formulário na Esquerda com foco prioritário) */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-8 sm:py-14 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
        {/* Coluna 1 (Esquerda): Painel de Conexão / Formulário em Primeiro Plano */}
        <div className="w-full max-w-[430px] rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-7 sm:p-8 shadow-xs relative overflow-hidden">

          {/* Cabeçalho do Card */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C3AED] text-white shadow-xs hover:shadow-[0_0_15px_rgba(124,58,237,0.3)]">
              <Star size={24} className="fill-white stroke-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Conectar Conta
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9DA2B4]">
                Sincronize com a nuvem One Star
              </p>
            </div>
          </div>

          {waitingSession ? (
            /* Estado Ativo: Aguardando autorização no navegador */
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#7C3AED]/20 animate-ping opacity-60" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA]">
                  <Loader2 size={30} className="animate-spin text-[#A78BFA]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Aguardando autorização no navegador...
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#9DA2B4] leading-relaxed">
                  Conclua o login na aba aberta do navegador para vincular este dispositivo automaticamente.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => window.open(waitingSession.authUrl, '_blank', 'noopener,noreferrer')}
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-100 dark:hover:bg-[#282A33] px-4 text-[13px] font-semibold text-slate-900 dark:text-white transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink size={14} className="text-[#A78BFA]" />
                  <span>Reabrir Página no Navegador</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelWaiting}
                    className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-100 dark:hover:bg-[#282A33] px-3 text-[13px] font-medium text-slate-700 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                    <span>Cancelar Espera</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-100 dark:hover:bg-[#282A33] px-3 text-[13px] font-medium text-slate-700 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Voltar aos Perfis</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Estado Inicial: Conectar Conta em Destaque */
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-[#9DA2B4] leading-relaxed">
                Clique no botão abaixo para abrir a autenticação segura e sincronizar seus perfis neste computador.
              </p>

              {/* Botão Primário Elegante */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConnect}
                className="w-full h-11 flex items-center justify-between rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white active:scale-[0.99] px-5 text-sm font-semibold shadow-xs hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] disabled:opacity-50 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <LogIn size={18} className="text-white stroke-[2.5]" />
                  )}
                  <span className="tracking-wide">Conectar Conta Nuvem</span>
                </div>
                <ArrowRight size={17} className="text-white stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Botão Secundário: Voltar para Perfis com Contraste Elegante */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoBack}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-[#1F2026] hover:bg-slate-100 dark:hover:bg-[#282A33] border border-slate-200/80 dark:border-[#2D3039] px-4 text-[13px] font-medium text-slate-700 dark:text-[#9DA2B4] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
              >
                <ArrowLeft size={15} className="text-slate-500 dark:text-[#9DA2B4]" />
                <span>Voltar para Perfis</span>
              </button>
            </div>
          )}
        </div>

        {/* Coluna 2 (Direita): Apresentação de Apoio / Benefícios da Nuvem */}
        <div className="flex-1 max-w-xl space-y-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A78BFA] text-xs font-medium">
              <Cloud size={13} />
              <span>Infraestrutura Nuvem & Sincronização</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
              Sincronize múltiplos perfis e proxies com segurança total.
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9DA2B4] leading-relaxed">
              Ao vincular sua conta, seus perfis, cookies, extensões e configurações de fingerprint permanecem protegidos e sincronizados entre todas as suas estações de trabalho.
            </p>
          </div>

          {/* Cards de Recursos Secundários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-4 space-y-1.5 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400">
                <Cloud size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Sincronização Contínua</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9DA2B4] leading-relaxed">
                Backup instantâneo de cookies e abas ao fechar cada perfil.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-4 space-y-1.5 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A78BFA]">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Zero Detecção</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9DA2B4] leading-relaxed">
                Isolamento estrito de Canvas, WebGL e AudioContext.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-4 space-y-1.5 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400">
                <Cpu size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Desempenho Nativo</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9DA2B4] leading-relaxed">
                Execução local veloz com suporte a proxies dedicados.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-4 space-y-1.5 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 dark:text-purple-400">
                <Zap size={16} />
              </div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Conexão em 1 Clique</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9DA2B4] leading-relaxed">
                Autenticação OAuth 2.0 PKCE segura sem expor senhas.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;

