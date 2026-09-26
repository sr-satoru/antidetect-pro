import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import {
  Shield,
  LogIn,
  UserPlus,
  Loader2,
  ExternalLink,
  X,
  HardDrive,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';

interface PendingAuthSession {
  sessionId: string;
  action: 'login' | 'register';
  authUrl: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCloudSession, continueOffline } = useAuth();

  const [loadingAction, setLoadingAction] = useState<'login' | 'register' | null>(null);
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
        const res = await fetch(
          `http://127.0.0.1:8000/api/auth/session/${waitingSession.sessionId}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data.status === 'authenticated' && data.user && data.token) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          setCloudSession(data.user, data.token);
          toast.success(`Conectado com sucesso como ${data.user.email || 'usuário'}!`);
          setWaitingSession(null);
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

  // 1. Iniciar fluxo de LOGIN no navegador
  const handleStartLogin = async () => {
    try {
      setLoadingAction('login');
      const res = await fetch('http://127.0.0.1:8000/api/auth/start-login', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar link de login. Verifique se o daemon local está ativo.');
      }

      const data = await res.json();
      window.open(data.auth_url, '_blank', 'noopener,noreferrer');
      toast.info('Abrindo navegador seguro para login...');

      setWaitingSession({
        sessionId: data.session_id,
        action: 'login',
        authUrl: data.auth_url,
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar login');
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Iniciar fluxo de REGISTRO no navegador
  const handleStartRegister = async () => {
    try {
      setLoadingAction('register');
      const res = await fetch('http://127.0.0.1:8000/api/auth/start-register', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar link de registro. Verifique se o daemon local está ativo.');
      }

      const data = await res.json();
      window.open(data.auth_url, '_blank', 'noopener,noreferrer');
      toast.info('Abrindo navegador seguro para criar conta...');

      setWaitingSession({
        sessionId: data.session_id,
        action: 'register',
        authUrl: data.auth_url,
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar cadastro');
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Continuar Offline
  const handleOffline = () => {
    continueOffline();
    toast.info('Modo Offline ativado. Perfis salvos localmente.');
    navigate('/perfis');
  };

  // 4. Cancelar espera de autorização
  const handleCancelWaiting = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setWaitingSession(null);
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#08090C] p-4 text-[#E1E4EA] select-none overflow-hidden font-sans">
      {/* Luzes de ambientação sutis */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#1677FF]/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#38bdf8]/10 blur-[140px]" />

      <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-[#262833] bg-[#14151C]/95 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Cabeçalho */}
        <div className="text-center space-y-2 mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1677FF] to-[#38bdf8] shadow-lg shadow-[#1677FF]/30">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Fury Antidetect
          </h1>
          <p className="text-xs text-[#8E92A2] leading-relaxed max-w-[300px] mx-auto">
            Navegação segura com isolamento de fingerprint e sincronização em nuvem.
          </p>
        </div>

        {waitingSession ? (
          /* Estado Ativo: Aguardando autorização no navegador */
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-60" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Loader2 size={30} className="animate-spin text-blue-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-white">
                Aguardando autorização no navegador...
              </h2>
              <p className="text-xs text-[#8E92A2] leading-relaxed">
                Conclua {waitingSession.action === 'register' ? 'o cadastro' : 'o login'} na aba aberta para vincular automaticamente o aplicativo.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => window.open(waitingSession.authUrl, '_blank', 'noopener,noreferrer')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#262833] bg-[#1a1c24] px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-[#20232d] hover:text-white transition-all shadow-sm"
              >
                <ExternalLink size={14} className="text-blue-400" />
                <span>Reabrir Página no Navegador</span>
              </button>

              <button
                type="button"
                onClick={handleCancelWaiting}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-[#8E92A2] hover:text-red-400 transition-colors"
              >
                <X size={14} />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Estado Inicial: 2 Botões de Ação Principais */
          <div className="space-y-4">
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleStartLogin}
              className="w-full flex items-center justify-between rounded-xl bg-[#1677FF] hover:bg-[#1462d6] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#1677FF]/25 disabled:opacity-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                {loadingAction === 'login' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LogIn size={18} className="text-white/80 group-hover:text-white transition-colors" />
                )}
                <span>Entrar na Conta</span>
              </div>
              <ArrowRight size={16} className="text-white/70 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleStartRegister}
              className="w-full flex items-center justify-between rounded-xl border border-[#262833] bg-[#181922] hover:bg-[#1f202c] hover:border-slate-700 px-5 py-3.5 text-sm font-semibold text-slate-200 hover:text-white disabled:opacity-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                {loadingAction === 'register' ? (
                  <Loader2 size={18} className="animate-spin text-blue-400" />
                ) : (
                  <UserPlus size={18} className="text-blue-400" />
                )}
                <span>Criar Nova Conta</span>
              </div>
              <Sparkles size={16} className="text-blue-400/70 group-hover:text-blue-400 transition-colors" />
            </button>

            {/* Divisor */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#262833]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-[#14151C] px-3 text-[#525666]">ou</span>
              </div>
            </div>

            {/* Continuar Offline */}
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleOffline}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-[#8E92A2] hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <HardDrive size={14} className="text-[#686d80]" />
              <span>Continuar em Modo Offline</span>
            </button>
          </div>
        )}

        {/* Rodapé informativo */}
        <div className="mt-8 pt-4 border-t border-[#1e2029] text-center">
          <p className="text-[11px] text-[#525666]">
            Padrão seguro RFC 8252 • Seus dados e chaves permanecem protegidos
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
