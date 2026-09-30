import React from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud,
  ShieldCheck,
  Cpu,
  Zap,
  ArrowRight,
  CheckCircle2,
  Check,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const HomePage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#08090C] text-[#E1E4EA] selection:bg-[#00FF66] selection:text-black overflow-x-hidden font-sans">
      {/* Luzes de ambientação características de frontend/app */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#00FF66]/8 blur-[160px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-white/[0.03] blur-[160px]" />
      <div className="pointer-events-none absolute bottom-1/4 -left-40 h-[450px] w-[450px] rounded-full bg-[#00FF66]/5 blur-[160px]" />

      <Header />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 pt-12 sm:pt-20 flex flex-col items-center justify-center text-center">
        {/* Badge superior */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] text-xs font-medium mb-8 shadow-sm">
          <Cloud size={14} />
          <span>Infraestrutura Nuvem & Sincronização Segura</span>
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight max-w-4xl">
          One Star <span className="bg-gradient-to-r from-[#00FF66] via-[#00F05E] to-[#00D655] bg-clip-text text-transparent">Multilogin</span>
        </h1>

        {/* Descrição sem jargões técnicos pesados */}
        <p className="text-sm sm:text-base md:text-lg text-[#9093A2] max-w-2xl mb-10 leading-relaxed">
          Gerenciamento profissional de perfis com isolamento rigoroso de fingerprints, sincronização em nuvem e autenticação rápida.
        </p>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <Link
            to="/auth?action=login"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF66] via-[#00F05E] to-[#00D655] hover:brightness-110 active:scale-[0.99] px-7 py-3.5 text-sm font-bold text-black shadow-lg shadow-[#00FF66]/25 transition-all group"
          >
            <span>Conectar Conta</span>
            <ArrowRight size={17} className="text-black stroke-[2.5] group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/auth?action=register"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1C1E27] hover:bg-[#252834] border border-white/15 hover:border-white/30 px-7 py-3.5 text-sm font-semibold text-[#E1E4EA] hover:text-white transition-all shadow-sm"
          >
            <span>Criar Nova Conta</span>
          </Link>
        </div>

        {/* Grid de Recursos limpo e direto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-16 text-left">
          <div className="rounded-xl border border-[#232530] bg-[#12131A]/70 p-5 space-y-2 hover:border-white/20 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Cloud size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white">Sincronização Contínua</h3>
            <p className="text-xs text-[#8E92A2] leading-relaxed">
              Backup instantâneo de cookies, abas e dados de navegação na nuvem.
            </p>
          </div>

          <div className="rounded-xl border border-[#232530] bg-[#12131A]/70 p-5 space-y-2 hover:border-white/20 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66]">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white">Anti-detecção Real</h3>
            <p className="text-xs text-[#8E92A2] leading-relaxed">
              Isolamento de Canvas, WebGL, Audio e parâmetros de hardware.
            </p>
          </div>

          <div className="rounded-xl border border-[#232530] bg-[#12131A]/70 p-5 space-y-2 hover:border-white/20 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cpu size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white">Alta Performance</h3>
            <p className="text-xs text-[#8E92A2] leading-relaxed">
              Execução veloz e leve para múltiplos perfis simultâneos.
            </p>
          </div>

          <div className="rounded-xl border border-[#232530] bg-[#12131A]/70 p-5 space-y-2 hover:border-white/20 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Zap size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white">Acesso Rápido</h3>
            <p className="text-xs text-[#8E92A2] leading-relaxed">
              Conexão com um clique pelo navegador e retorno automático ao app.
            </p>
          </div>
        </div>

        {/* =========================================
            SEÇÃO DE PREÇOS (PRICING SECTION)
        ========================================= */}
        <section id="precos" className="w-full pt-28 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] text-xs font-medium mb-4 shadow-sm">
            <CreditCard size={14} />
            <span>Planos & Preços</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Escolha o plano ideal para sua operação
          </h2>

          <p className="text-xs sm:text-sm text-[#8E92A2] max-w-xl mx-auto mb-16 leading-relaxed">
            De iniciantes a equipes e agências de alta escala, temos a estrutura certa para proteger e sincronizar seus perfis.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 text-left max-w-5xl mx-auto items-stretch">
            {/* Plano 1: Starter */}
            <div className="rounded-2xl border border-[#232530] bg-[#12131A]/80 p-7 sm:p-8 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Starter</h3>
                <p className="text-xs text-[#8E92A2] mb-6">Para operadores individuais e testes de contingência.</p>

                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">R$ 49</span>
                  <span className="text-xs text-[#8E92A2]">/mês</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#232530] text-xs text-[#E1E4EA]">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>Até <strong>10 perfis</strong> ativos</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>Isolamento total de fingerprints</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>Sincronização em nuvem básica</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>Suporte via comunidade</span>
                  </div>
                </div>
              </div>

              <Link
                to="/auth?action=register"
                className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-[#1C1E27] hover:bg-[#252834] border border-white/15 hover:border-white/30 px-4 py-3 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <span>Começar no Starter</span>
              </Link>
            </div>

            {/* Plano 2: Pro (Em Destaque) */}
            <div className="rounded-2xl border-2 border-[#00FF66] bg-[#151722] p-7 sm:p-8 flex flex-col justify-between relative shadow-2xl shadow-[#00FF66]/10 transform lg:-translate-y-2">
              {/* Badge Popular */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#00FF66] to-[#00D655] text-black text-[11px] font-extrabold tracking-wide uppercase shadow-md flex items-center gap-1.5">
                <Sparkles size={12} className="fill-black" />
                <span>Mais Escolhido</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1">Profissional</h3>
                <p className="text-xs text-[#8E92A2] mb-6">Para afiliados, gestores de tráfego e alta performance.</p>

                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white">R$ 147</span>
                  <span className="text-xs text-[#8E92A2]">/mês</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#232530] text-xs text-[#E1E4EA]">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0 stroke-[2.5]" />
                    <span>Até <strong>100 perfis</strong> ativos</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0 stroke-[2.5]" />
                    <span>Proxies dedicados ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0 stroke-[2.5]" />
                    <span>Sincronização dupla em tempo real</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0 stroke-[2.5]" />
                    <span>Acesso completo à API & Protocolo MCP</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0 stroke-[2.5]" />
                    <span>Suporte prioritário rápido</span>
                  </div>
                </div>
              </div>

              <Link
                to="/auth?action=register"
                className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF66] via-[#00F05E] to-[#00D655] hover:brightness-110 active:scale-[0.99] px-4 py-3.5 text-xs font-bold text-black shadow-lg shadow-[#00FF66]/25 transition-all group"
              >
                <span>Assinar Plano Pro</span>
                <ArrowRight size={15} className="text-black stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Plano 3: Enterprise */}
            <div className="rounded-2xl border border-[#232530] bg-[#12131A]/80 p-7 sm:p-8 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Enterprise</h3>
                <p className="text-xs text-[#8E92A2] mb-6">Para agências, times e operações de grande volume.</p>

                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">R$ 397</span>
                  <span className="text-xs text-[#8E92A2]">/mês</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#232530] text-xs text-[#E1E4EA]">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span><strong>Perfis ilimitados</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>Compartilhamento e gestão de equipe</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>Armazenamento S3 dedicado</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>Gerente de conta & Suporte 24/7 VIP</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#00FF66] shrink-0" />
                    <span>SLA de 99.9% de disponibilidade</span>
                  </div>
                </div>
              </div>

              <Link
                to="/auth?action=register"
                className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-[#1C1E27] hover:bg-[#252834] border border-white/15 hover:border-white/30 px-4 py-3 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <span>Falar com Especialista</span>
              </Link>
            </div>
          </div>

          {/* Garantias e Facilidades */}
          <div className="mt-14 pt-8 border-t border-[#232530] max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-xs text-[#8E92A2]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#00FF66]" />
              <span>Garantia de 7 dias ou seu dinheiro de volta</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#00FF66]" />
              <span>Cancele a qualquer momento sem fidelidade</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#00FF66]" />
              <span>Ativação imediata da conta</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
