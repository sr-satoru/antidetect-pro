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
    <div className="relative min-h-screen w-screen flex flex-col bg-[#08090C] text-[#E1E4EA] select-none overflow-x-hidden font-sans">
      {/* Header superior da página centralizado */}
      <header className="relative z-10 w-full h-16 border-b border-[#232530] bg-[#101116] px-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-md shadow-[#00FF66]/20">
            <Star size={18} className="fill-black stroke-black" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-white text-sm tracking-tight">One Star Multilogin</span>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#8E92A2]">
              Conta & Nuvem
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal da Página: Layout 2 Colunas (Formulário na Esquerda com foco prioritário) */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-8 sm:py-14 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
        {/* Coluna 1 (Esquerda): Painel de Conexão / Formulário em Primeiro Plano */}
        <div className="w-full max-w-[430px] rounded-2xl border border-white/15 bg-[#12131A] p-7 sm:p-8 shadow-2xl shadow-black/90 relative overflow-hidden">

          {/* Cabeçalho do Card */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-lg shadow-[#00FF66]/25">
              <Star size={24} className="fill-black stroke-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
                Conectar Conta
              </h2>
              <p className="text-xs text-[#9093A2]">
                Sincronize com a nuvem One Star
              </p>
            </div>
          </div>

          {waitingSession ? (
            /* Estado Ativo: Aguardando autorização no navegador */
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#00FF66]/20 animate-ping opacity-60" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66]">
                  <Loader2 size={30} className="animate-spin text-[#00FF66]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">
                  Aguardando autorização no navegador...
                </h3>
                <p className="text-xs text-[#8E92A2] leading-relaxed">
                  Conclua o login na aba aberta do navegador para vincular este dispositivo automaticamente.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => window.open(waitingSession.authUrl, '_blank', 'noopener,noreferrer')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#262833] bg-[#1a1c24] hover:bg-[#222530] px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
                >
                  <ExternalLink size={14} className="text-[#00FF66]" />
                  <span>Reabrir Página no Navegador</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelWaiting}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2.5 text-xs font-medium text-[#8E92A2] hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                    <span>Cancelar Espera</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2.5 text-xs font-medium text-[#8E92A2] hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Voltar aos Perfis</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Estado Inicial: Conectar Conta em Destaque */
            <div className="space-y-3.5">
              <p className="text-xs text-[#8E92A2] leading-relaxed">
                Clique no botão abaixo para abrir a autenticação segura e sincronizar seus perfis neste computador.
              </p>

              {/* Botão Primário Vibrante (Impossível passar despercebido) */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConnect}
                className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-[#00FF66] via-[#00F05E] to-[#00D655] hover:brightness-110 active:scale-[0.99] px-5 py-3.5 text-sm font-bold text-black shadow-lg shadow-[#00FF66]/25 disabled:opacity-50 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-black" />
                  ) : (
                    <LogIn size={18} className="text-black stroke-[2.5]" />
                  )}
                  <span className="tracking-wide">Conectar Conta Nuvem</span>
                </div>
                <ArrowRight size={17} className="text-black stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Botão Secundário: Voltar para Perfis com Contraste Elegante */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoBack}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1C1E27] hover:bg-[#252834] border border-white/15 hover:border-white/30 px-4 py-3 text-xs font-semibold text-[#E1E4EA] hover:text-white transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft size={15} className="text-[#9093A2]" />
                <span>Voltar para Perfis</span>
              </button>
            </div>
          )}
        </div>

        {/* Coluna 2 (Direita): Apresentação de Apoio / Benefícios da Nuvem */}
        <div className="flex-1 max-w-xl space-y-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] text-xs font-medium">
              <Cloud size={13} />
              <span>Infraestrutura Nuvem & Sincronização</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
              Sincronize múltiplos perfis e proxies com segurança total.
            </h1>
            <p className="text-xs sm:text-sm text-[#8E92A2] leading-relaxed">
              Ao vincular sua conta, seus perfis, cookies, extensões e configurações de fingerprint permanecem protegidos e sincronizados entre todas as suas estações de trabalho.
            </p>
          </div>

          {/* Cards de Recursos Secundários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-xl border border-[#232530] bg-[#12131A]/60 p-4 space-y-1.5 hover:border-white/20 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Cloud size={16} />
              </div>
              <h3 className="text-xs font-semibold text-white">Sincronização Contínua</h3>
              <p className="text-[11px] text-[#8E92A2] leading-relaxed">
                Backup instantâneo de cookies e abas ao fechar cada perfil.
              </p>
            </div>

            <div className="rounded-xl border border-[#232530] bg-[#12131A]/60 p-4 space-y-1.5 hover:border-white/20 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66]">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-xs font-semibold text-white">Zero Detecção</h3>
              <p className="text-[11px] text-[#8E92A2] leading-relaxed">
                Isolamento estrito de Canvas, WebGL e AudioContext.
              </p>
            </div>

            <div className="rounded-xl border border-[#232530] bg-[#12131A]/60 p-4 space-y-1.5 hover:border-white/20 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Cpu size={16} />
              </div>
              <h3 className="text-xs font-semibold text-white">Desempenho Nativo</h3>
              <p className="text-[11px] text-[#8E92A2] leading-relaxed">
                Execução local veloz com suporte a proxies dedicados.
              </p>
            </div>

            <div className="rounded-xl border border-[#232530] bg-[#12131A]/60 p-4 space-y-1.5 hover:border-white/20 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Zap size={16} />
              </div>
              <h3 className="text-xs font-semibold text-white">Conexão em 1 Clique</h3>
              <p className="text-[11px] text-[#8E92A2] leading-relaxed">
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

