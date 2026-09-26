import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fury Antidetect - Portal Oficial",
  description: "Gerenciamento de contas e sincronização em nuvem do Fury Antidetect Browser",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#080c14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
