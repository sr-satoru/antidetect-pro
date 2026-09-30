"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  ShieldAlert,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Lock,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export default function TermsPage() {
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
            <Scale className="w-3.5 h-3.5" />
            <span>{t.legal.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            {t.legal.termsTitle}
          </h1>
          <p className="text-sm sm:text-base text-[#9093A2] max-w-2xl mx-auto">
            {t.legal.termsSubtitle}
          </p>
          <div className="mt-3 text-xs text-[#5E6172] font-mono">
            {t.legal.lastUpdated}
          </div>
        </div>

        {/* Quick Highlights / Disclaimer Alert */}
        <div className="mb-10 rounded-2xl bg-[#12131A] border border-[#232530] p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2 text-sm text-zinc-300">
              <h3 className="font-bold text-white text-base">
                {isPt ? "Aviso Essencial de Responsabilidade" : "Essential Liability Notice"}
              </h3>
              <p className="text-xs sm:text-sm text-[#9093A2] leading-relaxed">
                {isPt
                  ? "O Star Multlogin é uma ferramenta de produtividade e isolamento de ambientes de navegação voltada a atividades lícitas (como gestão de mídias, marketing, desenvolvimento e testes de software). O usuário é o ÚNICO e EXCLUSIVO responsável civil e criminalmente por todas as ações realizadas através do software."
                  : "Star Multlogin is a browser isolation and productivity utility intended exclusively for lawful operations (such as media management, marketing, QA and development). The end user assumes SOLE and EXCLUSIVE civil and criminal liability for all operations conducted through the software."}
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
          {/* 1. Objeto */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">01.</span>
              {isPt ? "Objeto e Concessão de Licença" : "Subject Matter and License Grant"}
            </h2>
            <div className="space-y-3 text-zinc-400">
              <p>
                {isPt
                  ? "O Star Multlogin concede a você uma licença pessoal, não exclusiva, intransferível, gratuita e revogável para baixar, instalar e utilizar o software em seus dispositivos compatíveis, respeitadas as condições estipuladas nestes Termos."
                  : "Star Multlogin grants you a personal, non-exclusive, non-transferable, free, and revocable license to download, install, and use the software on compatible devices, subject to the conditions set forth in these Terms."}
              </p>
              <p>
                {isPt
                  ? "A gratuidade da plataforma refere-se ao uso das funcionalidades locais de perfis e utilitários disponibilizados publicamente, reservando-se aos mantenedores o direito de suspender ou alterar serviços sem prévia notificação individual."
                  : "The free tier applies to local profiles and publicly provided utilities, reserving the maintainers' right to modify or adjust services in accordance with system requirements."}
              </p>
            </div>
          </section>

          {/* 2. Uso Aceitável */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">02.</span>
              {isPt ? "Uso Aceitável e Proibições Estritas" : "Acceptable Use and Strict Prohibitions"}
            </h2>
            <p className="text-zinc-400 mb-4">
              {isPt
                ? "É terminantemente PROIBIDO utilizar o Star Multlogin para:"
                : "You are strictly PROHIBITED from utilizing Star Multlogin for:"}
            </p>
            <ul className="space-y-2.5 text-zinc-300 text-xs sm:text-sm pl-2">
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {isPt
                    ? "Prática de estelionato, fraudes financeiras, lavagem de capitais ou qualquer ilícito tipificado na legislação penal brasileira ou internacional."
                    : "Executing financial fraud, phishing, identity theft, unauthorized account takeovers, or criminal activity under applicable law."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {isPt
                    ? "Ataques de negação de serviço (DDoS), invasão de dispositivos alheios, exploração de vulnerabilidades e disseminação de vírus, spywares ou malwares."
                    : "Denial of service (DDoS) campaigns, network intrusions, exploitation of vulnerabilities, or distribution of malicious code."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {isPt
                    ? "Violação de direitos de propriedade intelectual, pirataria ou evasão maliciosa de proteções de segurança de terceiros."
                    : "Infringing third-party intellectual property rights or engaging in abusive automated scraping that violates website integrity."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  {isPt
                    ? "Engenharia reversa, descompilação ou tentativa de extração de código-fonte dos servidores e APIs do Star Multlogin sem expressa autorização."
                    : "Reverse engineering, decompiling, or attempting to compromise the backend infrastructure or proprietary modules of the service."}
                </span>
              </li>
            </ul>
          </section>

          {/* 3. Isenção de Responsabilidade */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">03.</span>
              {isPt ? "Isenção Total de Responsabilidade e Indenização" : "Full Limitation of Liability and Indemnification"}
            </h2>
            <div className="space-y-3 text-zinc-400">
              <p>
                {isPt
                  ? "Em nenhuma hipótese os desenvolvedores, mantenedores, colaboradores ou afiliados do Star Multlogin serão responsáveis perante você ou terceiros por quaisquer danos diretos, indiretos, incidentais, punitivos, lucros cessantes, perda de receitas, bloqueio de contas em plataformas de terceiros (Meta, Google, TikTok, Mercado Livre, etc.) decorrentes do uso da ferramenta."
                  : "Under no circumstances shall the creators, maintainers, or affiliates of Star Multlogin be liable for any direct, indirect, incidental, special, punitive, or consequential damages, including loss of profits, account restrictions on third-party platforms (e.g., Meta, Google, TikTok), or data corruption resulting from the software's use."}
              </p>
              <p>
                {isPt
                  ? "Você concorda em defender, indenizar e isentar o Star Multlogin de quaisquer reivindicações, processos judiciais, multas, custas advocatícias ou danos decorrentes da sua violação destes Termos ou de leis aplicáveis."
                  : "You agree to indemnify, defend, and hold harmless Star Multlogin against any legal claims, administrative fines, or legal fees resulting from your breach of these Terms or applicable laws."}
              </p>
            </div>
          </section>

          {/* 4. Ausência de Garantias (AS IS) */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">04.</span>
              {isPt ? "Fornecimento \"No Estado em que se Encontra\" (AS IS)" : "Service Provided \"AS IS\""}
            </h2>
            <div className="space-y-3 text-zinc-400">
              <p>
                {isPt
                  ? "O software é disponibilizado gratuitamente \"NO ESTADO EM QUE SE ENCONTRA\" (AS IS) e \"CONFORME DISPONÍVEL\", sem garantias expressas ou implícitas de comerciabilidade, adequação a uma finalidade específica ou ausência de erros."
                  : "The software is provided free of charge on an \"AS IS\" and \"AS AVAILABLE\" basis, without warranties of any kind, whether express or implied, including fitness for a particular purpose, uptime guarantees, or error-free execution."}
              </p>
              <p>
                {isPt
                  ? "Recomendamos que você mantenha cópias de segurança (backups) periódicas de seus dados e perfis locais. A integridade e retenção do ambiente operacional local é de sua exclusiva responsabilidade."
                  : "We advise maintaining periodic independent backups of your local operational profiles and browser sessions."}
              </p>
            </div>
          </section>

          {/* 5. Marco Civil e Cumprimento de Ordens */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">05.</span>
              {isPt ? "Marco Civil da Internet e Cooperação Judicial" : "Compliance with Legal Injunctions"}
            </h2>
            <p className="text-zinc-400">
              {isPt
                ? "Em conformidade com a Lei nº 12.965/2014 (Marco Civil da Internet) e a LGPD (Lei nº 13.709/2018), o Star Multlogin cooperará plenamente com autoridades judiciais competentes mediante ordem judicial válida, fornecendo os registros cadastrais e logs de conexão estritamente exigidos por lei."
                : "In compliance with federal internet legislation and data protection acts, Star Multlogin complies with valid court orders from competent authorities, providing required access logs and registration records strictly as mandated by law."}
            </p>
          </section>

          {/* 6. Foro e Legislação */}
          <section className="rounded-2xl bg-[#0e0f15] border border-[#232530] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-[#00FF66] font-mono text-sm">06.</span>
              {isPt ? "Legislação Aplicável e Foro de Eleição" : "Applicable Law and Jurisdiction"}
            </h2>
            <p className="text-zinc-400">
              {isPt
                ? "Estes Termos são regidos e interpretados segundo a legislação da República Federativa do Brasil. Para dirimir quaisquer litígios oriundos deste instrumento, fica eleito o Foro da Comarca de São Paulo/SP, com expressa renúncia a qualquer outro, por mais privilegiado que seja."
                : "These Terms are governed by and construed under the laws of the Federative Republic of Brazil. Any disputes arising hereunder shall be submitted to the exclusive jurisdiction of the competent courts of Brazil."}
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-[#232530] flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 text-sm text-[#00FF66] hover:underline"
          >
            <span>{isPt ? "Ver Política de Privacidade & LGPD" : "View Privacy Policy & LGPD"}</span>
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
