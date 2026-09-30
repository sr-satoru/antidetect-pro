"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ExternalLink, Star } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

function RedirectContent() {
  const { t } = useI18n();
  const c = t.authCallback;

  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const redirectUri = searchParams.get("redirect_uri") || "http://127.0.0.1:12540/api/auth/callback";

  const targetUrl = `${redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  const [redirected, setRedirected] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!code || !state || redirectedRef.current) return;

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
    <div className="rounded-3xl bg-[#12131A] border border-[#232530] p-8 text-center shadow-2xl relative overflow-hidden">
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#00FF66]/20 animate-ping opacity-60" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-lg shadow-[#00FF66]/25">
          <Star className="h-8 w-8 fill-black stroke-black" />
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
        {c.title}
      </h1>

      <p className="text-sm text-[#9093A2] mb-6">
        {c.description}
      </p>

      <div className="flex items-center justify-center gap-2 text-xs text-[#9093A2] mb-8">
        <Loader2 className="w-4 h-4 animate-spin text-[#00FF66]" />
        <span>{redirected ? c.statusConnecting : c.statusRedirecting}</span>
      </div>

      <div className="pt-4 border-t border-[#232530]">
        <button
          type="button"
          onClick={handleManualRedirect}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF66] to-[#00D655] px-4 py-3 text-xs font-bold text-black transition-all shadow-md shadow-[#00FF66]/20 hover:brightness-110 cursor-pointer"
        >
          <span>{c.btnReturn}</span>
          <ExternalLink className="w-3.5 h-3.5 text-black" />
        </button>
        <p className="mt-3 text-[11px] text-[#5E6172]">
          {c.fallbackNotice}
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#00FF66]" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
