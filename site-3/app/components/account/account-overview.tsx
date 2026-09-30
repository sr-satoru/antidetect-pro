"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CreditCard,
  Monitor,
  Cpu,
  ShieldAlert,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  RefreshCw,
  Plus,
  CheckCircle2,
  Lock,
  User,
} from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function AccountOverview() {
  const { t } = useI18n();
  const a = t.account;

  const [activeSection, setActiveSection] = useState<
    "plano" | "faturamento" | "dispositivos" | "api" | "seguranca"
  >("plano");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [apiCheckedSuccess, setApiCheckedSuccess] = useState(false);
  const [disconnectedOthers, setDisconnectedOthers] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const scrollTo = (id: string, sectionKey: typeof activeSection) => {
    setActiveSection(sectionKey);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText("vanirdemo@gmail.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard?.writeText("star_local_9b83f042e17c91a0");
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleTestApi = () => {
    setIsCheckingApi(true);
    setTimeout(() => {
      setIsCheckingApi(false);
      setApiCheckedSuccess(true);
      setTimeout(() => setApiCheckedSuccess(false), 3000);
    }, 800);
  };

  const handleDisconnectOthers = () => {
    setDisconnectedOthers(true);
    setTimeout(() => setDisconnectedOthers(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-12 pb-24">
      {/* Coluna Esquerda: Perfil e Navegação Minimalista */}
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        {/* Card do Usuário */}
        <div className="p-4 rounded-xl border border-[#232530] bg-[#101116] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#181922] border border-[#232530] flex items-center justify-center font-bold text-sm text-white">
              VD
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white truncate">
                  vanirdemo@gmail.com
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 cursor-pointer"
                  title="Copiar e-mail"
                >
                  {copiedEmail ? (
                    <Check className="w-3 h-3 text-[#00FF66]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                <span className="text-[11px] font-medium text-zinc-400">
                  {a.planName}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#1d1f28] flex items-center justify-between text-[11px] text-zinc-500">
            <span>Status</span>
            <span className="text-[#00FF66] font-medium">Ativo</span>
          </div>
        </div>

        {/* Menu de Navegação Minimalista */}
        <nav className="flex flex-row lg:flex-col flex-wrap gap-1 text-xs">
          <button
            type="button"
            onClick={() => scrollTo("sec-plano", "plano")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "plano"
                ? "bg-[#14151e] text-white border border-[#2a2d3c] shadow-sm font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#101116]"
            }`}
          >
            <Sparkles
              className={`w-4 h-4 ${
                activeSection === "plano" ? "text-[#00FF66]" : "text-zinc-500"
              }`}
            />
            <span>{a.navPlan}</span>
          </button>

          <button
            type="button"
            onClick={() => scrollTo("sec-faturamento", "faturamento")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "faturamento"
                ? "bg-[#14151e] text-white border border-[#2a2d3c] shadow-sm font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#101116]"
            }`}
          >
            <CreditCard
              className={`w-4 h-4 ${
                activeSection === "faturamento"
                  ? "text-[#00FF66]"
                  : "text-zinc-500"
              }`}
            />
            <span>{a.navBilling}</span>
          </button>

          <button
            type="button"
            onClick={() => scrollTo("sec-dispositivos", "dispositivos")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "dispositivos"
                ? "bg-[#14151e] text-white border border-[#2a2d3c] shadow-sm font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#101116]"
            }`}
          >
            <Monitor
              className={`w-4 h-4 ${
                activeSection === "dispositivos"
                  ? "text-[#00FF66]"
                  : "text-zinc-500"
              }`}
            />
            <span>{a.navDevices}</span>
          </button>

          <button
            type="button"
            onClick={() => scrollTo("sec-api", "api")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "api"
                ? "bg-[#14151e] text-white border border-[#2a2d3c] shadow-sm font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#101116]"
            }`}
          >
            <Cpu
              className={`w-4 h-4 ${
                activeSection === "api" ? "text-[#00FF66]" : "text-zinc-500"
              }`}
            />
            <span>{a.navApi}</span>
          </button>

          <button
            type="button"
            onClick={() => scrollTo("sec-seguranca", "seguranca")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer mt-1 ${
              activeSection === "seguranca"
                ? "bg-red-950/20 text-red-400 border border-red-900/30 font-medium"
                : "text-zinc-500 hover:text-red-400 hover:bg-red-950/10"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>{a.navSecurity}</span>
          </button>
        </nav>
      </aside>

      {/* Coluna Direita: Seções de Conteúdo */}
      <main className="space-y-10 max-w-[820px]">
        {/* Seção 1: Plano & Assinatura */}
        <section id="sec-plano" className="space-y-4 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {a.planTitle}
              </h2>
              <p className="text-xs text-[#9093A2] mt-0.5">{a.planSubtitle}</p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00FF66] hover:bg-[#00D655] text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,255,102,0.15)] self-start sm:self-auto cursor-pointer"
            >
              <span>{a.upgradeBtn}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-[#232530] bg-[#101116] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1d1f28]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">
                    {a.planName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20">
                    {a.planBadge}
                  </span>
                </div>
                <p className="text-xs text-[#9093A2] mt-1">{a.memberSince}</p>
              </div>
              <Link
                href="/pricing"
                className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
              >
                {a.comparePlans}
              </Link>
            </div>

            {/* Capacidades do Plano */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66] shrink-0" />
                <span>{a.planProfiles}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{a.cloudBackup}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 2: Gastos & Faturas */}
        <section id="sec-faturamento" className="space-y-4 scroll-mt-24">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {a.billingTitle}
            </h2>
            <p className="text-xs text-[#9093A2] mt-0.5">{a.billingSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card de Consumo */}
            <div className="p-4 rounded-xl border border-[#232530] bg-[#101116]">
              <span className="text-[11px] font-medium text-zinc-400">
                {a.currentSpend}
              </span>
              <div className="text-2xl font-black text-white mt-1">R$ 0,00</div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Sem renovações agendadas
              </span>
            </div>

            {/* Card de Forma de Pagamento */}
            <div className="sm:col-span-2 p-4 rounded-xl border border-[#232530] bg-[#101116] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-zinc-400">
                  {a.paymentMethod}
                </span>
                <div className="text-xs text-zinc-300 font-medium mt-1">
                  {a.noPaymentMethod}
                </div>
              </div>
              <div className="mt-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333644] bg-[#14151b] hover:bg-[#1c1d24] text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#00FF66]" />
                  <span>{a.addCard}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Estado de Faturas */}
          <div className="p-6 rounded-xl border border-[#232530] bg-[#101116] text-center">
            <span className="text-xs text-zinc-500">{a.noInvoices}</span>
          </div>
        </section>

        {/* Seção 3: Sessões & Dispositivos */}
        <section id="sec-dispositivos" className="space-y-4 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {a.devicesTitle}
              </h2>
              <p className="text-xs text-[#9093A2] mt-0.5">{a.devicesSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleDisconnectOthers}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-[#232530] bg-[#101116] hover:bg-[#181922] text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
            >
              {disconnectedOthers
                ? "Sessões encerradas!"
                : a.disconnectOthers}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#232530] bg-[#101116] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#181922] border border-[#232530] flex items-center justify-center text-zinc-400">
                <Monitor className="w-4 h-4 text-[#00FF66]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {a.currentDevice}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20">
                    {a.thisDevice}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Linux (x86_64) • {a.lastActive}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
              <span>Online</span>
            </div>
          </div>
        </section>

        {/* Seção 4: Conexão & API Local (Identidade Própria Star) */}
        <section id="sec-api" className="space-y-4 scroll-mt-24">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{a.apiTitle}</span>
            </h2>
            <p className="text-xs text-[#9093A2] mt-0.5">{a.apiSubtitle}</p>
          </div>

          <div className="rounded-xl border border-[#232530] bg-[#101116] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
                  <span className="text-xs font-semibold text-white">
                    {a.daemonStatus}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {a.daemonListening}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestApi}
                disabled={isCheckingApi}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333644] bg-[#14151b] hover:bg-[#1c1d24] text-xs font-medium text-white transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isCheckingApi ? "animate-spin" : ""}`}
                />
                <span>
                  {isCheckingApi
                    ? "Testando..."
                    : apiCheckedSuccess
                    ? "✓ Conexão OK (1.2ms)"
                    : a.checkDaemon}
                </span>
              </button>
            </div>

            {/* Token Local */}
            <div className="pt-3 border-t border-[#1d1f28] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-medium text-zinc-400">
                  {a.apiToken}
                </span>
                <div className="font-mono text-xs text-zinc-300 mt-0.5">
                  star_local_••••••••••••••••91a0
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                className="inline-flex items-center gap-1.5 text-xs text-[#00FF66] hover:text-[#00D655] font-medium transition-colors cursor-pointer self-start sm:self-auto"
              >
                {copiedToken ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>{a.tokenCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{a.copyToken}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Seção 5: Zona de Segurança */}
        <section id="sec-seguranca" className="space-y-4 scroll-mt-24">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-red-500 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>{a.securityTitle}</span>
            </h2>
            <p className="text-xs text-[#9093A2] mt-0.5">{a.securitySubtitle}</p>
          </div>

          <div className="p-4 sm:p-5 rounded-xl border border-red-950/40 bg-red-950/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-white">
                {a.deleteTitle}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-lg">
                {a.deleteDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              {a.deleteBtn}
            </button>
          </div>
        </section>

        {/* Rodapé: Botão de Encerrar Sessão */}
        <div className="pt-6 border-t border-[#1d1f28] flex justify-end">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#232530] bg-[#101116] hover:bg-[#181922] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-400" />
            <span>{a.logout}</span>
          </Link>
        </div>
      </main>

      {/* Modal de Confirmação de Exclusão de Conta */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#101116] border border-red-900/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">
                {a.deleteModalTitle}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {a.deleteModalDesc}
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-300">
                {a.deleteConfirmPrompt}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full px-3 py-2 rounded-lg bg-[#08090C] border border-[#232530] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {a.cancel}
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "EXCLUIR"}
                onClick={() => {
                  alert("Conta excluída com sucesso.");
                  window.location.href = "/";
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-colors cursor-pointer"
              >
                {a.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
