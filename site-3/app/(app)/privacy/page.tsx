"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Database,
  EyeOff,
  Server,
  UserCheck,
  Mail,
  FileCheck2,
  ArrowRight,
  Globe2,
} from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export default function PrivacyPage() {
  const { t, locale } = useI18n();
  const isPt = locale === "pt";

  return (
    <div className="relative min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#00FF66]/5 blur-[120px] rounded-full" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.legal.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            {t.legal.privacyTitle}
          </h1>
          <p className="text-sm sm:text-base text-[#9093A2] max-w-2xl mx-auto">
            {t.legal.privacySubtitle}
          </p>
          <div className="mt-3 text-xs text-[#5E6172] font-mono">
            {t.legal.lastUpdated}
          </div>
        </div>

        {/* Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-2xl bg-[#12131A] border border-[#232530] p-5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] mb-3">
              <EyeOff className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">
              {isPt ? "Zero Coleta de Navegação" : "Zero Browsing Logging"}
            </h4>
            <p className="text-xs text-[#9093A2] leading-relaxed">
              {isPt
                ? "Seus perfis, abas e histórico de navegação local nunca saem do seu computador."
                : "Your local profiles, tabs, and navigation history remain isolated on your device."}
            </p>
          </div>

          <div className="rounded-2xl bg-[#12131A] border border-[#232530] p-5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">
              {isPt ? "Criptografia de Ponta a Ponta" : "End-to-End Encryption"}
            </h4>
            <p className="text-xs text-[#9093A2] leading-relaxed">
              {isPt
                ? "Credenciais e backups de nuvem utilizam algoritmos de cifra de nível militar (AES-256 e TLS 1.3)."
                : "Credentials and cloud backups are encrypted with military-grade ciphers (AES-256 & TLS 1.3)."}
            </p>
          </div>

          <div className="rounded-2xl bg-[#12131A] border border-[#232530] p-5 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">
              {isPt ? "Controle Total do Titular" : "Full User Control"}
            </h4>
            <p className="text-xs text-[#9093A2] leading-relaxed">
              {isPt
                ? "Exercício imediato de direitos da LGPD: exportação e exclusão definitiva de conta a um clique."
                : "Instant LGPD rights execution: export and definitive account erasure with a single action."}
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
          {/* 1. Controlador e DPO */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">01.</span>
              {isPt ? "Controlador dos Dados e Encarregado (DPO)" : "Data Controller and DPO"}
            </h2>
            <div className="space-y-3 text-zinc-400">
              <p>
                {isPt
                  ? "Para fins da Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018 — LGPD), o Star Multlogin atua na qualidade de Controlador dos dados cadastrais e de acesso tratados em seus servidores."
                  : "For the purposes of data protection regulations (including the Brazilian General Data Protection Law - LGPD), Star Multlogin acts as the Data Controller regarding registration and server connection logs."}
              </p>
              <div className="p-4 rounded-xl bg-[#12131A] border border-[#232530] flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#00FF66] shrink-0" />
                <div className="text-xs">
                  <span className="text-white font-semibold block">
                    {isPt ? "Canal Oficial do Encarregado de Dados (DPO):" : "Official DPO Contact Channel:"}
                  </span>
                  <a
                    href="mailto:privacidade@starmultlogin.com"
                    className="text-[#00FF66] hover:underline font-mono"
                  >
                    privacidade@starmultlogin.com
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Dados Coletados & Bases Legais */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">02.</span>
              {isPt ? "Dados Coletados e Respectivas Bases Legais (LGPD)" : "Collected Data and Legal Bases (LGPD)"}
            </h2>
            <p className="text-zinc-400 mb-4">
              {isPt
                ? "Em conformidade com o Artigo 7º da LGPD, todo tratamento de dados realizado pelo Star Multlogin possui fundamentação jurídica expressa:"
                : "In compliance with Article 7 of the LGPD, all data processing operations are grounded in distinct legal bases:"}
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#12131A] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-white text-sm">
                    {isPt ? "E-mail, Senha e Nome de Cadastro" : "Email, Password, and Name"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#00FF66]/10 text-[#00FF66] text-xs font-mono font-medium">
                    Art. 7º, V — Execução de Contrato
                  </span>
                </div>
                <p className="text-xs text-[#9093A2]">
                  {isPt
                    ? "Finalidade: Autenticação de conta, recuperação de acesso e sincronização de configurações de perfil. Esses dados são indispensáveis para a prestação do serviço."
                    : "Purpose: Account authentication, password recovery, and multi-device profile sync. Essential for delivering the software service."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#12131A] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-white text-sm">
                    {isPt ? "Endereço IP, Data e Hora de Acesso" : "IP Address, Timestamp, and Access Logs"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-mono font-medium">
                    Art. 7º, II — Obrigação Legal (Marco Civil)
                  </span>
                </div>
                <p className="text-xs text-[#9093A2]">
                  {isPt
                    ? "Finalidade: Cumprimento estrito do Art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet), que exige a guarda de registros de acesso a aplicações de internet pelo prazo de 6 meses para segurança da rede e cooperação judiciária."
                    : "Purpose: Compliance with Article 15 of Federal Law 12.965/2014 (Brazilian Internet Framework), requiring the retention of application access logs for 6 months for security and judicial compliance."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#12131A] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-white text-sm">
                    {isPt ? "Cookies Técnicos e de Sessão" : "Technical & Session Cookies"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs font-mono font-medium">
                    Art. 7º, IX — Legítimo Interesse
                  </span>
                </div>
                <p className="text-xs text-[#9093A2]">
                  {isPt
                    ? "Finalidade: Manter você conectado ao painel web, proteção contra ataques de falsificação de requisição entre sites (CSRF) e prevenção contra ataques DDoS."
                    : "Purpose: Preserving active sessions, preventing CSRF exploits, and mitigating abusive automated queries."}
                </p>
              </div>
            </div>
          </section>

          {/* 3. Arquitetura Local */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">03.</span>
              {isPt ? "Arquitetura de Isolamento Local (Perfis do Antidetect)" : "Local Profile Isolation Architecture"}
            </h2>
            <div className="space-y-3 text-zinc-400">
              <p>
                {isPt
                  ? "Diferente de navegadores convencionais, o Star Multlogin foi concebido com privacidade por design (Privacy by Design):"
                  : "Unlike conventional web browsers, Star Multlogin is built under Privacy by Design principles:"}
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm pl-2">
                <li>
                  {isPt
                    ? "As impressões digitais (fingerprints de Canvas, WebGL, AudioContext, etc.) e cookies gerados em cada perfil ficam armazenados exclusivamente no disco rígido da sua máquina local."
                    : "Synthetic fingerprints (Canvas, WebGL, AudioContext) and profile cookies are persisted locally on your device disk."}
                </li>
                <li>
                  {isPt
                    ? "O Star Multlogin NÃO realiza telemetria do conteúdo das páginas que você visita nem dos dados inseridos em formulários durante a navegação."
                    : "Star Multlogin does NOT log or transmit web browsing contents, entered URLs, or form keystrokes from your profile sessions."}
                </li>
              </ul>
            </div>
          </section>

          {/* 4. Direitos do Titular */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">04.</span>
              {isPt ? "Seus Direitos como Titular (Art. 18 da LGPD)" : "Your Rights under LGPD (Article 18)"}
            </h2>
            <p className="text-zinc-400 mb-4">
              {isPt
                ? "Você possui total controle sobre seus dados pessoais e pode exercer gratuitamente a qualquer momento:"
                : "You hold complete control over your personal records and may exercise at any moment:"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[#12131A] border border-white/5 flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                <span>
                  <strong>{isPt ? "Acesso e Confirmação:" : "Access & Confirmation:"}</strong>{" "}
                  {isPt ? "Saber se tratamos seus dados e quais são." : "Confirm whether and which data we process."}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#12131A] border border-white/5 flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                <span>
                  <strong>{isPt ? "Correção e Retificação:" : "Correction:"}</strong>{" "}
                  {isPt ? "Atualizar dados incompletos ou inexatos." : "Update outdated or inaccurate data."}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#12131A] border border-white/5 flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                <span>
                  <strong>{isPt ? "Exclusão Definitiva:" : "Permanent Deletion:"}</strong>{" "}
                  {isPt ? "Apagar integralmente sua conta e dados da nuvem através da aba Minha Conta." : "Purge your cloud account and data directly from your account page."}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#12131A] border border-white/5 flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                <span>
                  <strong>{isPt ? "Portabilidade:" : "Portability:"}</strong>{" "}
                  {isPt ? "Exportar backups de suas configurações em formato estruturado." : "Export backups and settings in structured formats."}
                </span>
              </div>
            </div>
          </section>

          {/* 5. Segurança da Informação */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">05.</span>
              {isPt ? "Medidas de Segurança da Informação" : "Information Security Measures"}
            </h2>
            <p className="text-zinc-400">
              {isPt
                ? "Adotamos padrões rígidos de segurança cibernética para proteger seus dados contra acessos não autorizados, destruição ou vazamento. Isso inclui comunicação criptografada por TLS 1.3, hashing de senhas com sal (Argon2/bcrypt) e servidores em ambientes certificados ISO 27001 e SOC 2."
                : "We enforce stringent technical and organizational security controls to shield records against unauthorized access, destruction, or interception. This includes TLS 1.3 protocol encryption, robust password salting, and ISO 27001 / SOC 2 certified server infrastructure."}
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-[#232530] flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/terms"
            className="inline-flex items-center gap-2 text-sm text-[#00FF66] hover:underline"
          >
            <span>{isPt ? "Ver Termos de Uso do Software" : "View Terms of Service"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="text-xs text-[#9093A2] hover:text-white transition-colors"
          >
            {isPt ? "← Voltar à Página Inicial" : "← Back to Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
