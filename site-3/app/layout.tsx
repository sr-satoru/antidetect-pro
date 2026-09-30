import type { Metadata } from "next";
import "./globals.css";
import { ReactGrabDev } from "@/app/components/dev/react-grab";
import { I18nProvider } from "@/app/contexts/i18n-context";

export const metadata: Metadata = {
  title: "Navegador Anti-Detecção Profissional & Nuvem — Star Multlogin",
  description:
    "Star Multlogin: Perfis locais ilimitados, tecnologia anti-detecção avançada, proxies e VPN WireGuard por perfil, sincronização em nuvem e automação com IA.",
  icons: {
    icon: "/star-icon.png",
    apple: "/star-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="dark">
      <body className="bg-[#08090C] text-[#F4F4F6] antialiased selection:bg-[#00FF66] selection:text-black">
        {process.env.NODE_ENV === "development" && <ReactGrabDev />}
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
