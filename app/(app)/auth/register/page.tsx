import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import {
  Shield,
  User,
  Mail,
  Server,
  AlertCircle,
  Loader2,
  HardDrive,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerCloudAccount, continueOffline, serverUrl } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');
  const [cloudUrl, setCloudUrl] = useState(serverUrl || 'http://localhost:12342');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim()) {
      setError('Por favor, preencha o seu nome/usuário e seu e-mail.');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    try {
      setLoading(true);
      setLoadingStep('Criando conta no servidor da nuvem...');
      await new Promise((r) => setTimeout(r, 100));

      setLoadingStep('Vinculando dispositivo via Proof-of-Work seguro...');
      const result = await registerCloudAccount(
        email.trim(),
        username.trim(),
        plan,
        cloudUrl.trim(),
      );

      toast.success(`Conta criada com sucesso! Código gerado: ${result.code}`);
      navigate('/perfis');
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar conta no servidor.');
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const handleOffline = () => {
    continueOffline();
    toast.info('Modo Offline ativado. Dados serão salvos apenas localmente.');
    navigate('/perfis');
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#08090C] p-4 text-[#E1E4EA] select-none overflow-hidden">
      {/* Luzes de Fundo Sombreadas */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#1677FF]/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#DFE104]/5 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-[#262833] bg-[#14151C]/95 p-7 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Logo e Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1677FF] to-[#00D2FF] shadow-lg shadow-[#1677FF]/25">
            <Shield size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Criar Conta Fury Cloud
          </h1>
          <p className="text-xs text-[#8E92A2]">
            Sincronize seus perfis e sessões em múltiplos dispositivos
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Status de Loading */}
        {loading && loadingStep && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#1677FF]/30 bg-[#1677FF]/10 p-3 text-xs text-[#69b1ff]">
            <Loader2 size={15} className="animate-spin shrink-0 text-[#1677FF]" />
            <span>{loadingStep}</span>
          </div>
        )}

        {/* Formulário de Registro */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C8CBD4] uppercase tracking-wider">
              Nome de Usuário
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: vanir"
                disabled={loading}
                autoFocus
                className="w-full rounded-xl border border-[#2B2D38] bg-[#0B0C10] pl-9 pr-3.5 py-2.5 text-xs text-[#C8CBD4] placeholder:text-[#525564] focus:border-[#1677FF] focus:outline-none transition-colors"
              />
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787C8A]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C8CBD4] uppercase tracking-wider">
              Endereço de E-mail
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: usuario@empresa.com"
                disabled={loading}
                className="w-full rounded-xl border border-[#2B2D38] bg-[#0B0C10] pl-9 pr-3.5 py-2.5 text-xs text-[#C8CBD4] placeholder:text-[#525564] focus:border-[#1677FF] focus:outline-none transition-colors"
              />
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787C8A]"
              />
            </div>
          </div>

          {/* Seleção de Plano */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C8CBD4] uppercase tracking-wider">
              Plano de Perfis
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlan('starter')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  plan === 'starter'
                    ? 'border-[#1677FF] bg-[#1677FF]/15 text-white'
                    : 'border-[#2B2D38] bg-[#0B0C10] text-[#8E92A2] hover:text-[#C8CBD4]'
                }`}
              >
                <span className="text-[11px] font-bold">Starter</span>
                <span className="text-[9.5px] text-[#787C8A]">10 perfis</span>
              </button>

              <button
                type="button"
                onClick={() => setPlan('pro')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                  plan === 'pro'
                    ? 'border-[#DFE104] bg-[#DFE104]/10 text-white'
                    : 'border-[#2B2D38] bg-[#0B0C10] text-[#8E92A2] hover:text-[#C8CBD4]'
                }`}
              >
                <span className="text-[11px] font-bold text-[#DFE104]">Pro</span>
                <span className="text-[9.5px] text-[#787C8A]">100 perfis</span>
              </button>

              <button
                type="button"
                onClick={() => setPlan('enterprise')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  plan === 'enterprise'
                    ? 'border-[#1677FF] bg-[#1677FF]/15 text-white'
                    : 'border-[#2B2D38] bg-[#0B0C10] text-[#8E92A2] hover:text-[#C8CBD4]'
                }`}
              >
                <span className="text-[11px] font-bold">Team</span>
                <span className="text-[9.5px] text-[#787C8A]">Ilimitado</span>
              </button>
            </div>
          </div>

          {/* URL do Servidor Nuvem */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8E92A2] uppercase tracking-wider">
              URL do Servidor / VPS
            </label>
            <div className="relative">
              <input
                type="text"
                value={cloudUrl}
                onChange={(e) => setCloudUrl(e.target.value)}
                placeholder="http://localhost:12342 ou http://IP_VPS:12342"
                disabled={loading}
                className="w-full rounded-xl border border-[#2B2D38] bg-[#0B0C10] pl-9 pr-3.5 py-2 text-xs font-mono text-[#C8CBD4] placeholder:text-[#525564] focus:border-[#1677FF] focus:outline-none transition-colors"
              />
              <Server
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787C8A]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !email.trim()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1677FF] hover:bg-[#4096ff] py-2.5 text-xs font-bold text-white shadow-lg shadow-[#1677FF]/25 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Criar Conta e Conectar Agora</span>
              </>
            )}
          </button>
        </form>

        {/* Separador e Ações Secundárias */}
        <div className="space-y-3 pt-1 border-t border-[#262833]">
          <div className="flex items-center justify-between text-xs text-[#8E92A2]">
            <span>Já possui uma conta ou código?</span>
            <Link
              to="/auth/login"
              className="font-medium text-[#1677FF] hover:underline"
            >
              Fazer login / Vincular
            </Link>
          </div>

          <button
            type="button"
            onClick={handleOffline}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#2B2D38] bg-[#0B0C10] hover:bg-[#1E2028] py-2 text-xs font-medium text-[#A6A9B6] transition-colors"
          >
            <HardDrive size={13} />
            <span>Continuar em Modo Offline (Sem Nuvem)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
