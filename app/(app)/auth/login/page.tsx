import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { createQuickTestCode, DEFAULT_WEB_PORTAL_URL } from '@/services/cloud-auth';
import {
  Shield,
  ExternalLink,
  ClipboardPaste,
  AlertCircle,
  Loader2,
  HardDrive,
  Sparkles,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCode, continueOffline } = useAuth();

  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpeningWeb, setIsOpeningWeb] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Abrir login no portal web (Frontend 2)
  const handleOpenWebLogin = () => {
    setIsOpeningWeb(true);
    try {
      window.open(DEFAULT_WEB_PORTAL_URL, '_blank', 'noopener,noreferrer');
      toast.info('Abrindo página de login no seu navegador...');
    } catch (err) {
      toast.error('Não foi possível abrir o navegador.');
    } finally {
      setIsOpeningWeb(false);
    }
  };

  // 2. Colar código da área de transferência
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLinkCode(text.trim().toUpperCase());
        setError(null);
      }
    } catch {
      toast.error('Permissão para colar negada pelo navegador.');
    }
  };

  // 3. Gerar código de teste rápido (conveniência para testes imediatos)
  const handleGenerateQuickTest = async () => {
    try {
      setIsGeneratingTest(true);
      setError(null);
      const code = await createQuickTestCode();
      setLinkCode(code);
      toast.success(`Código de teste gerado: ${code}`);
    } catch (err: any) {
      setError(
        'Não foi possível conectar ao servidor da nuvem. Certifique-se de que o backend server está rodando.',
      );
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // 4. Submeter o código e autenticar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = linkCode.trim().toUpperCase();

    if (!cleanCode) {
      setError('Por favor, informe o seu Código de Vinculação.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginWithCode(cleanCode);
      toast.success('Dispositivo vinculado com sucesso à sua conta!');
      navigate('/perfis');
    } catch (err: any) {
      setError(
        err.message || 'Código inválido ou expirado. Verifique e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  // 5. Continuar offline
  const handleOffline = () => {
    continueOffline();
    toast.info('Modo Offline ativado. Navegação salva apenas neste computador.');
    navigate('/perfis');
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#08090C] p-4 text-[#E1E4EA] select-none overflow-hidden font-sans">
      {/* Luzes de ambientação sutis */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#1677FF]/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#DFE104]/5 blur-[130px]" />

      <div className="relative z-10 w-full max-w-[420px] space-y-6 rounded-2xl border border-[#262833] bg-[#14151C]/95 p-7 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Cabeçalho do App */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1677FF] to-[#00D2FF] shadow-lg shadow-[#1677FF]/25">
            <Shield size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Entrar no Fury
          </h1>
          <p className="text-xs text-[#8E92A2] leading-relaxed">
            Vincule este aplicativo à sua conta web para sincronizar seus perfis na nuvem.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Passo 1: Abrir Login Web */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-[#8E92A2] uppercase tracking-wider">
            1. Faça login na sua conta web
          </label>
          <button
            type="button"
            onClick={handleOpenWebLogin}
            disabled={isOpeningWeb || loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2B2D38] bg-[#1A1C24] hover:bg-[#222530] hover:border-[#3D4050] py-2.5 px-4 text-xs font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <ExternalLink size={14} className="text-[#1677FF]" />
            <span>Fazer login no portal web</span>
          </button>
        </div>

        {/* Formulário: Código de Vinculação */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="link-code"
                className="text-[11px] font-semibold text-[#8E92A2] uppercase tracking-wider"
              >
                2. Cole o código de vinculação
              </label>

              {/* Botão de teste rápido para ambiente de desenvolvimento */}
              <button
                type="button"
                onClick={handleGenerateQuickTest}
                disabled={isGeneratingTest || loading}
                className="inline-flex items-center gap-1 text-[11px] text-[#DFE104] hover:underline cursor-pointer disabled:opacity-50"
                title="Gera um código de teste na nuvem automaticamente"
              >
                <Sparkles size={11} />
                <span>{isGeneratingTest ? 'Gerando...' : 'Gerar código de teste'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                id="link-code"
                type="text"
                value={linkCode}
                onChange={(e) => {
                  setLinkCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="Ex: FURY-9A2B"
                disabled={loading}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-[#2B2D38] bg-[#0B0C10] pr-10 pl-3.5 py-3 text-center font-mono text-base font-bold tracking-widest text-[#DFE104] placeholder:text-[#4A4D5C] focus:border-[#1677FF] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Colar da área de transferência"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787C8A] hover:text-[#DFE104] cursor-pointer transition-colors"
              >
                <ClipboardPaste size={16} />
              </button>
            </div>
            <p className="text-[10.5px] text-[#787C8A]">
              O código de 8 caracteres é gerado nas configurações da sua conta web.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !linkCode.trim()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1677FF] hover:bg-[#4096ff] py-3 text-xs font-bold text-white shadow-lg shadow-[#1677FF]/25 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Verificando e conectando...</span>
              </>
            ) : (
              <>
                <KeyRound size={14} />
                <span>Vincular e Entrar</span>
                <ArrowRight size={13} className="ml-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Separador e Opção Offline */}
        <div className="space-y-3 pt-2 border-t border-[#262833]">
          <div className="flex items-center justify-center gap-1 text-xs text-[#8E92A2]">
            <span>Não tem conta?</span>
            <Link
              to="/auth/register"
              className="font-medium text-[#1677FF] hover:underline"
            >
              Criar conta na web
            </Link>
          </div>

          <button
            type="button"
            onClick={handleOffline}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#2B2D38] bg-[#0B0C10] hover:bg-[#1A1C24] py-2.5 text-xs font-medium text-[#A6A9B6] transition-colors"
          >
            <HardDrive size={13} className="text-[#8E92A2]" />
            <span>Continuar em Modo Offline (Sem Nuvem)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
