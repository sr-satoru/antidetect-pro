import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  LogIn,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryAction = searchParams.get('action') || 'login';
  const codeChallenge = searchParams.get('code_challenge') || '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') || 'S256';
  const state = searchParams.get('state') || '';
  const redirectUri = searchParams.get('redirect_uri') || 'http://127.0.0.1:12540/api/auth/callback';

  const isDesktopSession = Boolean(codeChallenge && state);

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    queryAction === 'register' ? 'register' : 'login'
  );

  useEffect(() => {
    if (queryAction === 'register' || queryAction === 'login') {
      setActiveTab(queryAction);
    }
  }, [queryAction]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:12342';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);

    try {
      const endpoint =
        activeTab === 'register'
          ? `${CLOUD_API_URL}/api/auth/web-register`
          : `${CLOUD_API_URL}/api/auth/web-login`;

      const payload = {
        email,
        password,
        name: activeTab === 'register' ? name : undefined,
        state,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Falha ao autenticar');
      }

      const redirectTarget = `/auth/redirect?code=${encodeURIComponent(data.code)}&state=${encodeURIComponent(
        data.state || state
      )}&redirect_uri=${encodeURIComponent(data.redirectUri || redirectUri)}`;

      navigate(redirectTarget);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao processar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#08090C] text-[#E1E4EA] selection:bg-[#00FF66] selection:text-black overflow-x-hidden font-sans">
      {/* Luzes de ambientação sutis */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#00FF66]/8 blur-[160px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-white/[0.03] blur-[160px]" />

      {/* Card Central Limpo e Focado */}
      <div className="w-full max-w-[420px] rounded-2xl border border-white/15 bg-[#12131A] p-7 sm:p-8 shadow-2xl shadow-black/90 backdrop-blur-xl relative overflow-hidden">
        {/* Luz de destaque interno suave */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#00FF66]/10 blur-3xl" />

        {/* Topo do Card: Logo única e hierarquia de títulos */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-lg shadow-[#00FF66]/20 mb-3">
            <Star size={22} className="fill-black stroke-black" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
            {activeTab === 'register' ? 'Criar Conta' : 'Entrar na Conta'}
          </h1>
          <p className="text-xs text-[#8E92A2] mt-1">
            {activeTab === 'register'
              ? 'Cadastre-se para sincronizar seus perfis'
              : 'Acesse para sincronizar seus perfis na nuvem'}
          </p>
        </div>

        {!isDesktopSession ? (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-start gap-2.5 text-xs text-[#8E92A2]">
            <Info size={14} className="text-[#00FF66] shrink-0 mt-0.5" />
            <span>Para vincular ao aplicativo desktop, inicie o acesso diretamente pelo Star App.</span>
          </div>
        ) : null}

        {/* Abas: Entrar / Criar Conta */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#191A21] p-1 mb-5 border border-[#232530]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setFormError('');
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-[#252834] text-white shadow-sm border border-white/10'
                : 'text-[#8E92A2] hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setFormError('');
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-[#252834] text-white shadow-sm border border-white/10'
                : 'text-[#8E92A2] hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {formError ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {activeTab === 'register' ? (
            <div>
              <label className="block text-xs font-medium text-[#E1E4EA] mb-1.5">Nome</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-[#5E6172]" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#232530] bg-[#191A21] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#5E6172] focus:border-[#00FF66] focus:outline-none focus:ring-1 focus:ring-[#00FF66] transition-colors"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-[#E1E4EA] mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-3 text-[#5E6172]" />
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#232530] bg-[#191A21] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#5E6172] focus:border-[#00FF66] focus:outline-none focus:ring-1 focus:ring-[#00FF66] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#E1E4EA] mb-1.5">Senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3 text-[#5E6172]" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#232530] bg-[#191A21] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#5E6172] focus:border-[#00FF66] focus:outline-none focus:ring-1 focus:ring-[#00FF66] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF66] via-[#00F05E] to-[#00D655] hover:brightness-110 active:scale-[0.99] px-4 py-3 text-sm font-bold text-black shadow-lg shadow-[#00FF66]/25 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-black" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{activeTab === 'register' ? 'Criar Conta' : 'Entrar'}</span>
                <ArrowRight size={15} className="text-black stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#232530] text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#8E92A2] hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Voltar à página inicial</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
