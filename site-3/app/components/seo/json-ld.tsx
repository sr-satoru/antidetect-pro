import React from "react";

export function JsonLd() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Star Multlogin",
    operatingSystem: "Windows 10, Windows 11, macOS, Linux",
    applicationCategory: "BusinessApplication",
    description:
      "Navegador antidetecção profissional de alta performance. Crie perfis locais ilimitados, spoofing de hardware real, proxies dedicados, VPN WireGuard e automação Playwright/Puppeteer com zero telemetria.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "840",
      bestRating: "5",
      worstRating: "1",
    },
    url: "https://starmultlogin.com",
    softwareVersion: "2.4.0",
    featureList: [
      "Perfis locais ilimitados e gratuitos",
      "Proteção completa de fingerprint de hardware (Canvas, WebGL, Audio)",
      "Motor Chromium Antidetect com spoofing de SO",
      "Gerenciador de proxies HTTP, HTTPS e SOCKS5",
      "Conexão nativa WireGuard VPN por perfil",
      "API REST local e suporte a CDP, Playwright e Puppeteer",
      "Sincronização em nuvem opcional com criptografia de ponta a ponta (E2E)",
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Star Multlogin",
    url: "https://starmultlogin.com",
    logo: "https://starmultlogin.com/star-icon.png",
    sameAs: [
      "https://t.me/starmultlogin",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      availableLanguage: ["Portuguese", "English", "Spanish", "French"],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "O Star Multlogin é gratuito?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sim. O Star Multlogin oferece perfis locais ilimitados de forma 100% gratuita, sem necessidade de cartão de crédito ou assinatura.",
        },
      },
      {
        "@type": "Question",
        name: "Como o Star Multlogin protege contra banimentos e fingerprinting?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "O Star Multlogin roda um motor Chromium modificado que substitui parâmetros reais de hardware (Canvas, WebGL, Audio, WebRTC, fontes e tela) sem criar ruído estatístico facilmente detectável por sistemas anti-fraude.",
        },
      },
      {
        "@type": "Question",
        name: "Posso conectar proxies e VPN em cada perfil?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sim. Você pode configurar proxies HTTP, HTTPS e SOCKS5, além de túneis VPN WireGuard nativos (.conf) de forma totalmente individualizada para cada perfil.",
        },
      },
      {
        "@type": "Question",
        name: "O Star Multlogin tem suporte a automação de robôs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sim. O Star Multlogin possui um Daemon REST local nativo na porta 12540 e suporta conexões Chrome DevTools Protocol (CDP) com bibliotecas como Playwright e Puppeteer em Python e Node.js.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
