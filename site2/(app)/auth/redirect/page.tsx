import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

export const RedirectPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';
  const redirectUri = searchParams.get('redirect_uri') || 'http://127.0.0.1:12540/api/auth/callback';

  const hasParams = Boolean(code && state);
  const targetUrl = `${redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  const [redirected, setRedirected] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!hasParams || redirectedRef.current) return;

    const timer = setTimeout(() => {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        setRedirected(true);
        window.location.replace(targetUrl);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [hasParams, targetUrl]);

  const handleManualRedirect = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hasParams) return;
    if (!redirectedRef.current) {
      redirectedRef.current = true;
      setRedirected(true);
      window.location.replace(targetUrl);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#08090C] text-[#E1E4EA] selection:bg-[#00FF66] selection:text-black overflow-x-hidden font-sans">
      {/* Luzes de ambientação */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#00FF66]/8 blur-[160px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-white/[0.03] blur-[160px]" />

      <div className="w-full max-w-[420px] rounded-2xl border border-white/15 bg-[#12131A] p-7 sm:p-8 text-center shadow-2xl shadow-black/90 backdrop-blur-xl relative overflow-hidden">
        {/* Luz de destaque interno suave */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#00FF66]/10 blur-3xl" />

        {hasParams ? (
          <>
            <div className="relative mx-auto mb-5 flex h-18 w-18 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#00FF66]/20 animate-ping opacity-60" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] shadow-lg">
                <CheckCircle2 size={28} className="text-[#00FF66]" />
              </div>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white mb-2">
              Autenticação Concluída
            </h1>

            <p className="text-xs text-[#8E92A2] mb-6 leading-relaxed">
              Sua conta foi autorizada. Retornando ao aplicativo...
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-[#8E92A2] mb-6 bg-[#191A21] py-2.5 px-4 rounded-xl border border-[#232530]">
              <Loader2 size={15} className="animate-spin text-[#00FF66]" />
              <span>{redirected ? 'Conectando ao aplicativo...' : 'Redirecionando automaticamente...'}</span>
            </div>

            <div className="pt-4 border-t border-[#232530]">
              <button
                type="button"
                onClick={handleManualRedirect}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF66] via-[#00F05E] to-[#00D655] hover:brightness-110 active:scale-[0.99] px-4 py-3 text-xs font-bold text-black shadow-lg shadow-[#00FF66]/25 transition-all cursor-pointer"
              >
                <span>Retornar ao Aplicativo</span>
                <ExternalLink size={14} className="text-black" />
              </button>
            </div>
          </>
        ) : (
          <div className="py-2">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-base font-bold text-white mb-1.5">Sessão Não Encontrada</h2>
            <p className="text-xs text-[#8E92A2] mb-5 leading-relaxed">
              Nenhuma sessão de autenticação ativa foi identificada.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF66] to-[#00D655] hover:brightness-110 px-4 py-2.5 text-xs font-bold text-black transition-all shadow-md shadow-[#00FF66]/20"
            >
              <ArrowLeft size={14} />
              <span>Ir para o Login</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedirectPage;
