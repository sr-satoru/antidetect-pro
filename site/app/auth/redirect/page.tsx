"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";

function RedirectContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const redirectUri = searchParams.get("redirect_uri") || "http://127.0.0.1:8000/api/auth/callback";

  const targetUrl = `${redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  const [redirected, setRedirected] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!code || !state || redirectedRef.current) return;

    // Redirecionamento automático suave estilo Google OAuth 2.0 (uma única vez)
    const timer = setTimeout(() => {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        setRedirected(true);
        window.location.replace(targetUrl);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [code, state, targetUrl]);

  const handleManualRedirect = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!redirectedRef.current) {
      redirectedRef.current = true;
      setRedirected(true);
      window.location.replace(targetUrl);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(34,197,94,0.12),rgba(255,255,255,0))] -z-10" />

      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Autenticação Concluída!
        </h1>

        <p className="text-sm text-slate-300 mb-6">
          Sua conta foi autorizada com sucesso. Retornando ao aplicativo <strong>Fury Antidetect</strong>...
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-8">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>{redirected ? "Conectando ao app..." : "Redirecionando automaticamente..."}</span>
        </div>

        {/* Botão de fallback manual caso o navegador bloqueie o redirecionamento */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleManualRedirect}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-semibold text-white transition-all shadow-md"
          >
            <span>Retornar Manualmente ao Fury App</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <p className="mt-3 text-[11px] text-slate-500">
            Se a janela do aplicativo não atualizar em alguns segundos, clique no botão acima.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
