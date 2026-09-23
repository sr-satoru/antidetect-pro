import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Lock, User, Mail, Shield, AlertCircle, Loader2, HardDrive, Cloud } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [mode, setMode] = useState<'offline' | 'online'>('offline'); // 'offline' = sem e-mail, 'online' = com e-mail
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'offline') {
      if (!username.trim() || !password.trim()) {
        setError('Por favor, preencha o nome de usuário e a senha.');
        return;
      }
      if (username.trim().length < 3) {
        setError('O nome de usuário deve ter pelo menos 3 caracteres.');
        return;
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setError('Por favor, informe seu e-mail e crie uma senha.');
        return;
      }
      if (!email.includes('@')) {
        setError('Por favor, insira um e-mail válido.');
        return;
      }
    }

    if (password.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'offline') {
        await register({ username: username.trim(), password });
      } else {
        await register({ email: email.trim(), username: username.trim() || undefined, password });
      }
      navigate('/perfis');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#08090C] p-4 text-[#E1E4EA] select-none overflow-hidden">
      {/* Luzes de Fundo Sombreadas */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#1677FF]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#DFE104]/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-[#262833] bg-[#14151C] p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Logo e Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1677FF] to-[#00D2FF] shadow-lg shadow-[#1677FF]/20">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Criar Conta no Fury
          </h1>
          <p className="text-xs text-[#8E92A2]">
            {mode === 'offline'
              ? 'Conta local 100% offline no seu computador (sem e-mail)'
              : 'Conta na nuvem vinculada com seu e-mail'}
          </p>
        </div>

        {/* Seletor de Modo: Offline (Sem E-mail) vs Nuvem (Com E-mail) */}
        <div className="flex rounded-xl bg-[#1A1C25] p-1 border border-[#2B2D3A]">
          <button
            type="button"
            onClick={() => {
              setMode('offline');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'offline'
                ? 'bg-[#DFE104] text-black shadow-md'
                : 'text-[#8E92A2] hover:text-white'
            }`}
          >
            <HardDrive size={14} />
            <span>Sem E-mail (Offline)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('online');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'online'
                ? 'bg-[#1677FF] text-white shadow-md'
                : 'text-[#8E92A2] hover:text-white'
            }`}
          >
            <Cloud size={14} />
            <span>Com E-mail (Nuvem)</span>
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Cadastro */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'offline' ? (
            /* Campos Modo Offline: Sem E-mail */
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#C8CBD4]">
                Nome de Usuário (Username)
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
                  placeholder="Ex: operador01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#5C6070] transition-colors focus:border-[#DFE104] focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            /* Campos Modo Nuvem: Com E-mail */
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#C8CBD4]">
                  E-mail
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
                  />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#5C6070] transition-colors focus:border-[#1677FF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#C8CBD4]">
                  Nome de Usuário (Opcional)
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
                  />
                  <input
                    type="text"
                    placeholder="Ex: vanir"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#5C6070] transition-colors focus:border-[#1677FF] focus:outline-hidden"
                  />
                </div>
              </div>
            </>
          )}

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
                placeholder="Mínimo de 4 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#5C6070] transition-colors focus:border-[#1677FF] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#C8CBD4]">
              Confirmar Senha
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[#686C7E]"
              />
              <input
                type="password"
                required
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#2D303E] bg-[#1A1C24] pr-3 pl-9 text-xs text-white placeholder-[#5C6070] transition-colors focus:border-[#1677FF] focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 ${
              mode === 'offline'
                ? 'bg-[#DFE104] text-black hover:bg-[#C5C702]'
                : 'bg-[#1677FF] text-white hover:bg-[#3B8BFF]'
            }`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <span>
                {mode === 'offline' ? 'Cadastrar Usuário Offline' : 'Cadastrar Conta Nuvem'}
              </span>
            )}
          </button>
        </form>

        {/* Link para Fazer Login */}
        <div className="text-center pt-2 border-t border-[#262833]">
          <p className="text-xs text-[#8E92A2]">
            Já possui cadastro?{' '}
            <Link
              to="/auth/login"
              className="font-semibold text-[#DFE104] hover:underline"
            >
              Fazer Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
