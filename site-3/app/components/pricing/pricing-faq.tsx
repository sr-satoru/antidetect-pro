"use client";

import React, { useState } from "react";
import { ChevronDown, CreditCard } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function PricingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { t, language } = useI18n();
  const p = t.pricingPage;

  const faqs = language === "en" ? [
    {
      q: "Do I need a credit card to use the Free plan?",
      a: "No. You don't even need to create an account. Simply download Star Multlogin for your operating system and start creating unlimited local profiles immediately.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept national and international credit/debit cards, Pix, and cryptocurrencies including Bitcoin (BTC), USDT, and USDC.",
    },
    {
      q: "Can I cancel my subscription at any time?",
      a: "Yes. You can cancel with a single click in your account dashboard at any time. Your cloud features will remain active until the end of your current billing period.",
    },
    {
      q: "What happens if I don't renew my cloud plan?",
      a: "Your local profiles are NEVER deleted or locked. They continue to run locally on your computer with complete independence.",
    },
  ] : language === "es" ? [
    {
      q: "¿Necesito tarjeta de crédito para usar el plan Gratuito?",
      a: "No. Ni siquiera necesita registrarse. Descargue Star Multlogin para su sistema operativo y comience a crear perfiles locales ilimitados de inmediato.",
    },
    {
      q: "¿Cuáles son los métodos de pago aceptados?",
      a: "Aceptamos tarjetas de crédito y débito nacionales e internacionales, Pix y criptomonedas como Bitcoin (BTC), USDT y USDC.",
    },
    {
      q: "¿Puedo cancelar mi suscripción en cualquier momento?",
      a: "Sí. Puede cancelar con un solo clic desde el panel de su cuenta cuando lo desee, manteniendo los recursos en la nube activos hasta el final del ciclo.",
    },
    {
      q: "¿Qué sucede si no renuevo mi plan en la nube?",
      a: "Sus perfiles locales NUNCA se eliminan ni se bloquean. Siguen funcionando con total normalidad en su máquina.",
    },
  ] : language === "fr" ? [
    {
      q: "Ai-je besoin d'une carte bancaire pour utiliser le forfait Gratuit ?",
      a: "Non. Vous n'avez même pas besoin de créer un compte. Téléchargez simplement Star Multlogin pour votre système d'exploitation et créez des profils illimités immédiatement.",
    },
    {
      q: "Quels sont les moyens de paiement acceptés ?",
      a: "Nous acceptons les cartes de crédit/débit nationales et internationales, Pix, ainsi que les cryptomonnaies telles que Bitcoin (BTC), USDT et USDC.",
    },
    {
      q: "Puis-je résilier mon abonnement à tout moment ?",
      a: "Oui. L'annulation se fait en un clic depuis votre tableau de bord à tout moment, les fonctionnalités cloud restant actives jusqu'à la fin de la période.",
    },
    {
      q: "Que se passe-t-il si je ne renouvelle pas mon forfait cloud ?",
      a: "Vos profils locaux ne sont JAMAIS supprimés ni bloqués. Ils continuent de fonctionner parfaitement sur votre machine locale.",
    },
  ] : [
    {
      q: "Preciso de um cartão de crédito para usar o plano Gratuito?",
      a: "Não. Você nem precisa criar uma conta. Basta baixar o Star Multlogin para o seu sistema operacional e começar a criar seus perfis locais ilimitados imediatamente.",
    },
    {
      q: "Quais são as formas de pagamento aceitas?",
      a: "Aceitamos Pix, cartões de crédito e débito nacionais e internacionais, e criptomoedas como Bitcoin (BTC), USDT e USDC.",
    },
    {
      q: "Posso cancelar minha assinatura a qualquer momento?",
      a: "Sim. O cancelamento pode ser feito com um clique no painel da sua conta a qualquer momento, mantendo os recursos em nuvem ativos até o fim do ciclo vigente.",
    },
    {
      q: "O que acontece se eu não renovar o plano em nuvem?",
      a: "Seus perfis locais NUNCA são apagados ou bloqueados. Eles continuam funcionando normalmente na sua máquina.",
    },
  ];

  return (
    <div className="mt-24 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#12131A] border border-[#232530] text-xs text-[#9093A2] mb-3">
          <CreditCard className="w-3.5 h-3.5 text-[#00FF66]" />
          <span>{p.faqBadge}</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white">
          {p.faqTitle}
        </h3>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-[#232530] bg-[#12131A] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base font-semibold text-zinc-200">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 transition-transform ${
                    isOpen ? "rotate-180 text-[#00FF66]" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#9093A2] leading-relaxed border-t border-[#1a1c26]">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
