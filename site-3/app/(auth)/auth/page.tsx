"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Mail, User, AlertCircle, Loader2, ArrowRight, Star, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/contexts/i18n-context";

function AuthContent() {
  const { t } = useI18n();
  const a = t.auth;

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const CLOUD_API_URL = process.env.NEXT_PUBLIC_CLOUD_API_URL || "http://localhost:12342";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (activeTab === "register" && !acceptedTerms) {
      setFormError(a.termsRequiredError || "Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.");
      return;
    }

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
        throw new Error(data.message || data.error || a.authErrorDefault);
      }

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        router.push("/account");
      }
    } catch (err: any) {
      setFormError(err.message || a.authErrorDefault);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-[#12131A] border border-[#232530] p-8 shadow-2xl relative overflow-hidden">
      {/* Ambient green glow inside card */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#00FF66]/10 blur-3xl" />

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] mb-3 shadow-lg shadow-[#00FF66]/20">
          <Star className="w-6 h-6 fill-black stroke-black" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {activeTab === "login" ? a.loginTitle : a.registerTitle}
        </h1>
        <p className="mt-1 text-xs text-[#9093A2]">
          {isDesktopSession ? a.desktopSub : a.cloudSub}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-[#08090C] p-1 border border-[#232530] mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("login");
            setFormError("");
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "login"
              ? "bg-white text-black shadow-sm"
              : "text-[#9093A2] hover:text-white"
          }`}
        >
          {a.tabLogin}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("register");
            setFormError("");
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "register"
              ? "bg-white text-black shadow-sm"
              : "text-[#9093A2] hover:text-white"
          }`}
        >
          {a.tabRegister}
        </button>
      </div>

      {formError && (
        <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {activeTab === "register" && (
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              {a.labelName}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={a.placeholderName}
                className="w-full pl-10 pr-4 py-2.5 bg-[#08090C] border border-[#232530] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66]"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            {a.labelEmail}
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={a.placeholderEmail}
              className="w-full pl-10 pr-4 py-2.5 bg-[#08090C] border border-[#232530] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            {a.labelPassword}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={a.placeholderPassword}
              className="w-full pl-10 pr-4 py-2.5 bg-[#08090C] border border-[#232530] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66]"
            />
          </div>
        </div>

        {activeTab === "register" && (
          <div className="pt-1 pb-1">
            <label className="flex items-start gap-3 cursor-pointer group text-xs text-zinc-400 select-none">
              <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (e.target.checked) setFormError("");
                  }}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border border-[#232530] bg-[#08090C] transition-all peer-checked:bg-[#00FF66] peer-checked:border-[#00FF66] peer-focus:ring-2 peer-focus:ring-[#00FF66]/30 flex items-center justify-center group-hover:border-zinc-500">
                  <Check className="w-3 h-3 text-black stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="leading-relaxed">
                {a.agreeTermsPrefix}{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00FF66] underline hover:text-[#00FF66]/80 font-medium"
                >
                  {a.termsLink}
                </Link>{" "}
                {a.and}{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00FF66] underline hover:text-[#00FF66]/80 font-medium"
                >
                  {a.privacyLink}
                </Link>
                .
              </span>
            </label>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || (activeTab === "register" && !acceptedTerms)}
          variant="star"
          className="w-full gap-2 text-sm font-bold mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>{a.btnConnecting}</span>
            </>
          ) : (
            <>
              <span>{activeTab === "login" ? a.btnLogin : a.btnRegister}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-[#232530] text-center text-xs text-[#5E6172]">
        {a.privacyNotice}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#00FF66]" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
