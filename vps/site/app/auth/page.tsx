"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, Lock, Mail, User, AlertCircle, Loader2, ArrowRight } from "lucide-react";

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryAction = searchParams.get("action") || "login";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "S256";
  const state = searchParams.get("state") || "";
  const redirectUri = searchParams.get("redirect_uri") || "http://127.0.0.1:12540/api/auth/callback";

  const isDesktopSession = Boolean(codeChallenge && state);

  const [activeTab, setActiveTab] = useState<"login" | "register">(
    queryAction === "register" ? "register" : "login"
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const CLOUD_API_URL = process.env.NEXT_PUBLIC_CLOUD_API_URL || "http://localhost:12342";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    try {
      const endpoint =
        activeTab === "register"
          ? `${CLOUD_API_URL}/api/auth/web-register`
          : `${CLOUD_API_URL}/api/auth/web-login`;

      const payload = {
        email,
        password,
        name: activeTab === "register" ? name : undefined,
        state,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Falha ao processar solicitação");
      }

      // Redireciona para a página de retorno padrão Google OAuth 2.0
      const redirectTarget = `/auth/redirect?code=${encodeURIComponent(data.code)}&state=${encodeURIComponent(
        data.state || state
      )}&redirect_uri=${encodeURIComponent(data.redirectUri || redirectUri)}`;

      router.push(redirectTarget);
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado ao conectar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] -z-10" />

      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header com Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Fury Antidetect</h1>
          <p className="text-xs text-slate-400 mt-1">Portal de Autenticação Segura (OAuth 2.0 PKCE)</p>
        </div>

        {!isDesktopSession ? (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              Para vincular este acesso ao Fury Desktop, inicie a ação diretamente no aplicativo.
            </div>
          </div>
        ) : null}

        {/* Abas: Entrar / Criar Conta */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setFormError("");
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === "login"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setFormError("");
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === "register"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Criar Conta
          </button>
        </div>

        {formError ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{formError}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === "register" ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Nome de Usuário</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome ou apelido"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{activeTab === "register" ? "Criar Conta & Conectar App" : "Entrar & Conectar App"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Protegido por criptografia ponta a ponta e padrão Google RFC 8252.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
