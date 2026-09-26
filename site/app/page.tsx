import Link from "next/link";
import { Shield, Sparkles, Cloud, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] -z-10" />

      <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Portal de Nuvem & Autenticação
      </div>

      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl mb-4">
        Fury Antidetect <span className="text-blue-500">Cloud</span>
      </h1>

      <p className="text-slate-400 text-base md:text-lg max-w-xl mb-8 leading-relaxed">
        Gerenciamento seguro de perfis com fingerprints avançados, sincronização criptografada e autenticação unificada OAuth 2.0.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/auth?action=login"
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all"
        >
          Acessar Conta
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/auth?action=register"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-all"
        >
          Criar Nova Conta
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mt-16 text-left">
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30">
          <Shield className="w-6 h-6 text-blue-400 mb-3" />
          <h2 className="text-base font-semibold text-white mb-1">Fingerprint Isolado</h2>
          <p className="text-xs text-slate-400">Cada perfil opera com Canvas, WebGL, Audio e fontes 100% independentes.</p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30">
          <Cloud className="w-6 h-6 text-cyan-400 mb-3" />
          <h2 className="text-base font-semibold text-white mb-1">Nuvem & Sincronização</h2>
          <p className="text-xs text-slate-400">Sincronização rápida de cookies, extensões e dados via armazenamento S3 seguro.</p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/30">
          <Sparkles className="w-6 h-6 text-purple-400 mb-3" />
          <h2 className="text-base font-semibold text-white mb-1">OAuth 2.0 Nativo</h2>
          <p className="text-xs text-slate-400">Conexão segura no navegador padrão sem expor senhas ao app local.</p>
        </div>
      </div>
    </main>
  );
}
