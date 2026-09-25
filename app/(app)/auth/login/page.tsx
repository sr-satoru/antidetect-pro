import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Lock, User, Shield, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !password.trim()) {
      setError('Por favor, informe seu usuário ou e-mail e a senha.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(loginInput.trim(), password);
      navigate('/perfis');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#08090C] p-4 text-[#E1E4EA] select-none overflow-hidden">
      {/* Luzes de Fundo Sombreadas */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#1677FF]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#DFE104]/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-[#262833] bg-[#14151C] p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Logo e Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1677FF] to-[#00D2FF] shadow-lg shadow-[#1677FF]/20">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Fury Antidetect
          </h1>
          <p className="text-xs text-[#8E92A2]">
            Navegação multiconas anti-impressão digital segura
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#C8CBD4]">
              Usuário ou E-mail
            </label>
            <div className="relative">
              <User
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
              />
              <input
                type="text"
                required
                autoFocus
                placeholder="Nome de usuário (Offline) ou e-mail (Nuvem)"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#5C6070] transition-colors focus:border-[#DFE104] focus:outline-hidden"
              />
            </div>
            <span className="mt-1 block text-[10.5px] text-[#6C7084]">
              Para conta local offline, informe seu usuário sem e-mail.
            </span>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#C8CBD4]">
              Senha
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
              />
              <input
                type="password"
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#5C6070] transition-colors focus:border-[#DFE104] focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#DFE104] text-xs font-semibold text-black shadow-[0_2px_12px_rgba(223,225,4,0.2)] transition-all hover:bg-[#C5C702] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-black" />
            ) : (
              <span>Entrar na Nuvem</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/perfis')}
            className="flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-[#2B2D38] bg-[#181A22] text-xs font-medium text-[#8E92A2] hover:bg-[#20222D] hover:text-white transition-colors"
          >
            ⚡ Continuar no Modo Offline (Sem Conta)
          </button>
        </form>

        {/* Link para Criar Conta */}
        <div className="text-center pt-2 border-t border-[#262833]">
          <p className="text-xs text-[#8E92A2]">
            Não tem uma conta cadastrada?{' '}
            <Link
              to="/auth/register"
              className="font-semibold text-[#DFE104] hover:underline"
            >
              Criar Conta na Nuvem
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
