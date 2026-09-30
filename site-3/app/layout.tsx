import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactGrabDev } from "@/app/components/dev/react-grab";
import { I18nProvider } from "@/app/contexts/i18n-context";
import { JsonLd } from "@/app/components/seo/json-ld";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://starmultlogin.com";

export const viewport: Viewport = {
  themeColor: "#08090C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Star Multlogin — Navegador Antidetect Profissional & Nuvem",
    template: "%s | Star Multlogin",
  },
  description:
    "Navegador antidetecção profissional de alta performance. Perfis locais ilimitados gratuitos, fingerprints reais de hardware, proxy e VPN WireGuard por perfil, sincronização em nuvem e automação Playwright/Puppeteer com zero telemetria.",
  keywords: [
    "navegador antidetect",
    "antidetect browser",
    "star multlogin",
    "multilogin gratis",
    "antidetect para afiliados",
    "gestão de perfis facebook ads",
    "anti ban browser",
    "fingerprint spoofing",
    "proxy manager",
    "wireguard antidetect",
    "automação playwright",
    "automação puppeteer",
    "contingencia facebook",
    "contingencia google ads",
    "multi account browser",
  ],
  authors: [{ name: "Star Multlogin Team", url: baseUrl }],
  creator: "Star Multlogin",
  publisher: "Star Multlogin",
  applicationName: "Star Multlogin",
  generator: "Next.js",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/?lang=pt",
      "en-US": "/?lang=en",
      "es-ES": "/?lang=es",
      "fr-FR": "/?lang=fr",
    },
  },
  openGraph: {
    title: "Star Multlogin — Navegador Antidetect Profissional & Nuvem",
    description:
      "Perfis locais ilimitados, fingerprints consistentes de hardware, proxy e VPN WireGuard independentes por perfil e zero telemetria.",
    url: baseUrl,
    siteName: "Star Multlogin",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/star-icon.png",
        width: 512,
        height: 512,
        alt: "Star Multlogin — Navegador Antidetecção",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Star Multlogin — Navegador Antidetect Profissional",
    description:
      "Perfis locais ilimitados, fingerprints reais de hardware, proxy e VPN WireGuard independentes por perfil e zero telemetria.",
    images: ["/star-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/star-icon.png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/star-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="dark" suppressHydrationWarning>
      <body className="bg-[#08090C] text-[#F4F4F6] antialiased selection:bg-[#00FF66] selection:text-black">
        <JsonLd />
        {process.env.NODE_ENV === "development" && <ReactGrabDev />}
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
